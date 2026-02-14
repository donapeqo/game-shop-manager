import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { User, Pod, Console, Session, CanvasSettings } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) throw authError;
          if (!authData.user) throw new Error('No user returned');

          // Fetch user details from our users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (userError) throw userError;
          if (!userData) throw new Error('User not found in database');

          set({ user: userData as User, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Login failed', 
            isLoading: false 
          });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await supabase.auth.signOut();
          set({ user: null, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Logout failed', 
            isLoading: false 
          });
        }
      },

      checkSession: async () => {
        set({ isLoading: true });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (!userError && userData) {
              set({ user: userData as User, isLoading: false });
              return;
            }
          }
          
          set({ user: null, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Session check failed', 
            isLoading: false 
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

interface PodState {
  pods: Pod[];
  consoles: Console[];
  sessions: Session[];
  canvasSettings: CanvasSettings | null;
  isLoading: boolean;
  error: string | null;
  
  fetchPods: () => Promise<void>;
  fetchConsoles: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  fetchCanvasSettings: () => Promise<void>;
  createPod: (pod: Omit<Pod, 'id' | 'created_at' | 'current_session_id'>) => Promise<void>;
  updatePod: (podId: string, updates: Partial<Pod>) => Promise<void>;
  updatePodPosition: (podId: string, x: number, y: number) => Promise<void>;
  updatePodSize: (podId: string, width: number, height: number) => Promise<void>;
  deletePod: (podId: string) => Promise<void>;
  createConsole: (console: Omit<Console, 'id' | 'created_at'>) => Promise<void>;
  updateConsole: (consoleId: string, updates: Partial<Console>) => Promise<void>;
  deleteConsole: (consoleId: string) => Promise<void>;
  createSession: (session: Omit<Session, 'id' | 'created_at'>) => Promise<void>;
  updateSession: (sessionId: string, updates: Partial<Session>) => Promise<void>;
  cancelSession: (sessionId: string, podId: string) => Promise<void>;
  extendSession: (sessionId: string, additionalMinutes: number, additionalPayment: number) => Promise<void>;
  completeSession: (sessionId: string, podId: string) => Promise<void>;
  updateCanvasBackground: (base64Image: string | null) => Promise<void>;
  subscribeToChanges: () => void;
}

export const usePodStore = create<PodState>()((set) => ({
  pods: [],
  consoles: [],
  sessions: [],
  canvasSettings: null,
  isLoading: false,
  error: null,

  fetchCanvasSettings: async () => {
    try {
      const { data, error } = await supabase
        .from('canvas_settings')
        .select('*')
        .single();

      if (error) throw error;
      set({ canvasSettings: data as CanvasSettings });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch canvas settings'
      });
    }
  },

  updateCanvasBackground: async (base64Image: string | null) => {
    try {
      const { error } = await supabase
        .from('canvas_settings')
        .update({ background_image: base64Image })
        .eq('id', (await supabase.from('canvas_settings').select('id').single()).data?.id);

      if (error) throw error;

      set((state) => ({
        canvasSettings: state.canvasSettings
          ? { ...state.canvasSettings, background_image: base64Image }
          : null
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update canvas background'
      });
    }
  },

  fetchPods: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('pods')
        .select('*')
        .order('row')
        .order('col');

      if (error) throw error;
      set({ pods: data as Pod[], isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch pods', 
        isLoading: false 
      });
    }
  },

  fetchConsoles: async () => {
    try {
      const { data, error } = await supabase
        .from('consoles')
        .select('*')
        .order('name');

      if (error) throw error;
      set({ consoles: data as Console[] });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch consoles' 
      });
    }
  },

  fetchSessions: async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ sessions: data as Session[] });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch sessions' 
      });
    }
  },

  updatePod: async (podId: string, updates: Partial<Pod>) => {
    try {
      const { error } = await supabase
        .from('pods')
        .update(updates)
        .eq('id', podId);

      if (error) throw error;
      
      // Optimistic update
      set((state) => ({
        pods: state.pods.map(pod => 
          pod.id === podId ? { ...pod, ...updates } : pod
        )
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update pod' 
      });
    }
  },

  updatePodPosition: async (podId: string, x: number, y: number) => {
    try {
      const { error } = await supabase
        .from('pods')
        .update({ canvas_x: x, canvas_y: y })
        .eq('id', podId);

      if (error) throw error;
      
      // Optimistic update
      set((state) => ({
        pods: state.pods.map(pod => 
          pod.id === podId ? { ...pod, canvas_x: x, canvas_y: y } : pod
        )
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update pod position' 
      });
    }
  },

  updatePodSize: async (podId: string, width: number, height: number) => {
    try {
      const { error } = await supabase
        .from('pods')
        .update({ canvas_width: width, canvas_height: height })
        .eq('id', podId);

      if (error) throw error;
      
      // Optimistic update
      set((state) => ({
        pods: state.pods.map(pod => 
          pod.id === podId ? { ...pod, canvas_width: width, canvas_height: height } : pod
        )
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update pod size' 
      });
    }
  },

  createSession: async (session: Omit<Session, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert(session)
        .select()
        .single();

      if (error) throw error;
      
      // Update pod status
      await supabase
        .from('pods')
        .update({ 
          status: 'payment_pending',
          current_session_id: data.id 
        })
        .eq('id', session.pod_id);

      set((state) => ({
        sessions: [data as Session, ...state.sessions]
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create session' 
      });
    }
  },

  updateSession: async (sessionId: string, updates: Partial<Session>) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) throw error;
      
      set((state) => ({
        sessions: state.sessions.map(session => 
          session.id === sessionId ? { ...session, ...updates } : session
        )
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update session' 
      });
    }
  },

  createPod: async (pod: Omit<Pod, 'id' | 'created_at' | 'current_session_id'>) => {
    try {
      const { data, error } = await supabase
        .from('pods')
        .insert(pod)
        .select()
        .single();

      if (error) throw error;
      
      set((state) => ({
        pods: [...state.pods, data as Pod]
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create pod'
      });
      throw error;
    }
  },

  deletePod: async (podId: string) => {
    try {
      const { error } = await supabase
        .from('pods')
        .delete()
        .eq('id', podId);

      if (error) throw error;
      
      set((state) => ({
        pods: state.pods.filter(pod => pod.id !== podId)
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete pod'
      });
      throw error;
    }
  },

  createConsole: async (console: Omit<Console, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('consoles')
        .insert(console)
        .select()
        .single();

      if (error) throw error;
      
      set((state) => ({
        consoles: [...state.consoles, data as Console]
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create console'
      });
      throw error;
    }
  },

  updateConsole: async (consoleId: string, updates: Partial<Console>) => {
    try {
      const { error } = await supabase
        .from('consoles')
        .update(updates)
        .eq('id', consoleId);

      if (error) throw error;
      
      set((state) => ({
        consoles: state.consoles.map(c => 
          c.id === consoleId ? { ...c, ...updates } : c
        )
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update console'
      });
      throw error;
    }
  },

  deleteConsole: async (consoleId: string) => {
    try {
      const { error } = await supabase
        .from('consoles')
        .delete()
        .eq('id', consoleId);

      if (error) throw error;
      
      set((state) => ({
        consoles: state.consoles.filter(c => c.id !== consoleId)
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete console'
      });
      throw error;
    }
  },

  cancelSession: async (sessionId: string, podId: string) => {
    try {
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;
      
      const { error: podError } = await supabase
        .from('pods')
        .update({ 
          status: 'available',
          current_session_id: null 
        })
        .eq('id', podId);

      if (podError) throw podError;
      
      set((state) => ({
        sessions: state.sessions.map(s => 
          s.id === sessionId ? { ...s, status: 'cancelled' } : s
        ),
        pods: state.pods.map(pod => 
          pod.id === podId ? { ...pod, status: 'available', current_session_id: null } : pod
        )
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to cancel session'
      });
      throw error;
    }
  },

  extendSession: async (sessionId: string, additionalMinutes: number, additionalPayment: number) => {
    try {
      const session = usePodStore.getState().sessions.find(s => s.id === sessionId);
      if (!session) throw new Error('Session not found');

      const currentEndTime = new Date(session.end_time);
      const newEndTime = new Date(currentEndTime.getTime() + additionalMinutes * 60000);
      const newDuration = session.duration_minutes + additionalMinutes;
      const newPayment = session.payment_amount + additionalPayment;

      const { error } = await supabase
        .from('sessions')
        .update({
          end_time: newEndTime.toISOString(),
          duration_minutes: newDuration,
          payment_amount: newPayment
        })
        .eq('id', sessionId);

      if (error) throw error;
      
      set((state) => ({
        sessions: state.sessions.map(s => 
          s.id === sessionId ? { 
            ...s, 
            end_time: newEndTime.toISOString(),
            duration_minutes: newDuration,
            payment_amount: newPayment
          } : s
        )
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to extend session'
      });
      throw error;
    }
  },

  completeSession: async (sessionId: string, podId: string) => {
    try {
      const session = usePodStore.getState().sessions.find(s => s.id === sessionId);
      if (!session) throw new Error('Session not found');

      const { error: sessionError } = await supabase
        .from('sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      const pod = usePodStore.getState().pods.find(p => p.id === podId);
      const console = usePodStore.getState().consoles.find(c => c.id === session.console_id);
      
      const { error: historyError } = await supabase
        .from('rental_history')
        .insert({
          session_id: sessionId,
          customer_phone: session.customer_phone,
          pod_name: pod?.name || 'Unknown',
          console_name: console?.name || 'Unknown',
          start_time: session.start_time,
          end_time: new Date().toISOString(),
          duration_minutes: session.duration_minutes,
          amount_paid: session.payment_amount
        });

      if (historyError) throw historyError;
      
      const { error: podError } = await supabase
        .from('pods')
        .update({ 
          status: 'available',
          current_session_id: null 
        })
        .eq('id', podId);

      if (podError) throw podError;
      
      set((state) => ({
        sessions: state.sessions.map(s => 
          s.id === sessionId ? { ...s, status: 'completed' } : s
        ),
        pods: state.pods.map(pod => 
          pod.id === podId ? { ...pod, status: 'available', current_session_id: null } : pod
        )
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to complete session'
      });
      throw error;
    }
  },

  subscribeToChanges: () => {
    supabase
      .channel('pods-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'pods' },
        () => {
          usePodStore.getState().fetchPods();
        }
      )
      .subscribe();

    supabase
      .channel('sessions-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sessions' },
        () => {
          usePodStore.getState().fetchSessions();
        }
      )
      .subscribe();
  },
}));
