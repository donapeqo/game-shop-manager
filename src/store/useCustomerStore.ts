import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import type { AvailablePod, CustomerBooking, CustomerProfile } from '@/types';

interface BookingDraft {
  customerName: string;
  customerPhone: string;
  notes: string;
  startTime: string;
  durationMinutes: number;
}

interface CustomerAuthState {
  customer: CustomerProfile | null;
  bookings: CustomerBooking[];
  availablePods: AvailablePod[];
  isCheckingSession: boolean;
  isSubmittingAuth: boolean;
  isSearchingAvailability: boolean;
  isCreatingBooking: boolean;
  error: string | null;
  clearError: () => void;
  checkSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (profile: { email: string; password: string; fullName: string; phone: string }) => Promise<void>;
  signOut: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  searchAvailability: (startTime: string, durationMinutes: number) => Promise<void>;
  createBooking: (podId: string, draft: BookingDraft) => Promise<void>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const useCustomerStore = create<CustomerAuthState>()((set, get) => ({
  customer: null,
  bookings: [],
  availablePods: [],
  isCheckingSession: false,
  isSubmittingAuth: false,
  isSearchingAvailability: false,
  isCreatingBooking: false,
  error: null,

  clearError: () => set({ error: null }),

  checkSession: async () => {
    set({ isCheckingSession: true, error: null });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        set({ customer: null, bookings: [], isCheckingSession: false });
        return;
      }

      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        set({
          customer: null,
          bookings: [],
          error: 'This account is not set up for customer bookings yet.',
          isCheckingSession: false,
        });
        return;
      }

      set({ customer: data as CustomerProfile, isCheckingSession: false });
      await get().fetchBookings();
    } catch (error) {
      set({
        customer: null,
        bookings: [],
        error: getErrorMessage(error, 'Unable to verify your session.'),
        isCheckingSession: false,
      });
    }
  },

  signIn: async (email, password) => {
    set({ isSubmittingAuth: true, error: null });

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No customer account was returned.');

      const { data: profile, error: profileError } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error('This account does not have a customer booking profile.');

      set({ customer: profile as CustomerProfile, isSubmittingAuth: false });
      await get().fetchBookings();
    } catch (error) {
      set({
        error: getErrorMessage(error, 'Customer sign-in failed.'),
        isSubmittingAuth: false,
      });
    }
  },

  signUp: async ({ email, password, fullName, phone }) => {
    set({ isSubmittingAuth: true, error: null });

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Unable to create the customer account.');

      const profilePayload = {
        id: authData.user.id,
        email,
        full_name: fullName,
        phone,
      };

      const { data: profile, error: profileError } = await supabase
        .from('customer_profiles')
        .upsert(profilePayload)
        .select('*')
        .single();

      if (profileError) throw profileError;

      set({ customer: profile as CustomerProfile, isSubmittingAuth: false });
      await get().fetchBookings();
    } catch (error) {
      set({
        error: getErrorMessage(error, 'Customer sign-up failed.'),
        isSubmittingAuth: false,
      });
    }
  },

  signOut: async () => {
    set({ isCheckingSession: true, error: null });

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({
        customer: null,
        bookings: [],
        availablePods: [],
        isCheckingSession: false,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error, 'Unable to sign out right now.'),
        isCheckingSession: false,
      });
    }
  },

  fetchBookings: async () => {
    const customer = get().customer;

    if (!customer) {
      set({ bookings: [] });
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_my_bookings');

      if (error) throw error;

      set({ bookings: (data ?? []) as CustomerBooking[] });
    } catch (error) {
      set({
        error: getErrorMessage(error, 'Unable to load your bookings.'),
      });
    }
  },

  searchAvailability: async (startTime, durationMinutes) => {
    set({ isSearchingAvailability: true, error: null, availablePods: [] });

    try {
      const startDate = new Date(startTime);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

      const { data, error } = await supabase.rpc('get_available_pods', {
        booking_start: startDate.toISOString(),
        booking_end: endDate.toISOString(),
      });

      if (error) throw error;

      const availablePods = ((data ?? []) as Database['public']['Views']['bookable_pods']['Row'][]).flatMap((pod) => {
        if (!pod.pod_id || !pod.pod_name || !pod.console_id || !pod.console_name || !pod.console_type) {
          return [];
        }

        return [{
          pod_id: pod.pod_id,
          pod_name: pod.pod_name,
          console_id: pod.console_id,
          console_name: pod.console_name,
          console_type: pod.console_type,
        }];
      });

      set({ availablePods, isSearchingAvailability: false });
    } catch (error) {
      set({
        error: getErrorMessage(error, 'Unable to check availability right now.'),
        isSearchingAvailability: false,
      });
    }
  },

  createBooking: async (podId, draft) => {
    set({ isCreatingBooking: true, error: null });

    try {
      const startDate = new Date(draft.startTime);
      const endDate = new Date(startDate.getTime() + draft.durationMinutes * 60000);

      const { error } = await supabase.rpc('create_customer_booking', {
        selected_pod_id: podId,
        booking_start: startDate.toISOString(),
        booking_end: endDate.toISOString(),
        booking_customer_name: draft.customerName,
        booking_customer_phone: draft.customerPhone,
        booking_notes: draft.notes || null,
      });

      if (error) throw error;

      set({ isCreatingBooking: false, availablePods: [] });
      await get().fetchBookings();
    } catch (error) {
      set({
        error: getErrorMessage(error, 'Unable to create that booking.'),
        isCreatingBooking: false,
      });
    }
  },
}));
