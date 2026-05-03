export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string;
          customer_id: string;
          pod_id: string;
          console_id: string;
          customer_name: string;
          customer_phone: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          status: 'reserved' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
          payment_status: 'pending' | 'paid' | 'refunded';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          pod_id: string;
          console_id: string;
          customer_name: string;
          customer_phone: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          status?: 'reserved' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
          payment_status?: 'pending' | 'paid' | 'refunded';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          pod_id?: string;
          console_id?: string;
          customer_name?: string;
          customer_phone?: string;
          start_time?: string;
          end_time?: string;
          duration_minutes?: number;
          status?: 'reserved' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
          payment_status?: 'pending' | 'paid' | 'refunded';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      consoles: {
        Row: {
          id: string;
          name: string;
          type: string;
          status: 'available' | 'in_use' | 'maintenance';
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          status?: 'available' | 'in_use' | 'maintenance';
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          status?: 'available' | 'in_use' | 'maintenance';
          created_at?: string;
        };
      };
      customer_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string;
          created_at?: string;
        };
      };
      pods: {
        Row: {
          id: string;
          name: string;
          row: number;
          col: number;
          console_id: string | null;
          status: 'available' | 'occupied' | 'payment_pending' | 'maintenance';
          current_session_id: string | null;
          canvas_x: number;
          canvas_y: number;
          canvas_width: number;
          canvas_height: number;
          tuya_enabled: boolean;
          tuya_device_id: string | null;
          tuya_ip_address: string | null;
          tuya_protocol_version: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          row: number;
          col: number;
          console_id?: string | null;
          status?: 'available' | 'occupied' | 'payment_pending' | 'maintenance';
          current_session_id?: string | null;
          canvas_x?: number;
          canvas_y?: number;
          canvas_width?: number;
          canvas_height?: number;
          tuya_enabled?: boolean;
          tuya_device_id?: string | null;
          tuya_ip_address?: string | null;
          tuya_protocol_version?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          row?: number;
          col?: number;
          console_id?: string | null;
          status?: 'available' | 'occupied' | 'payment_pending' | 'maintenance';
          current_session_id?: string | null;
          canvas_x?: number;
          canvas_y?: number;
          canvas_width?: number;
          canvas_height?: number;
          tuya_enabled?: boolean;
          tuya_device_id?: string | null;
          tuya_ip_address?: string | null;
          tuya_protocol_version?: string | null;
          created_at?: string;
        };
      };
      rental_history: {
        Row: {
          id: string;
          session_id: string;
          customer_phone: string;
          pod_name: string;
          console_name: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          amount_paid: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          customer_phone: string;
          pod_name: string;
          console_name: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          amount_paid: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          customer_phone?: string;
          pod_name?: string;
          console_name?: string;
          start_time?: string;
          end_time?: string;
          duration_minutes?: number;
          amount_paid?: number;
          created_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          booking_id: string | null;
          pod_id: string;
          console_id: string;
          customer_phone: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          payment_status: 'pending' | 'paid';
          payment_amount: number;
          status: 'pending' | 'active' | 'completed' | 'cancelled';
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id?: string | null;
          pod_id: string;
          console_id: string;
          customer_phone: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          payment_status?: 'pending' | 'paid';
          payment_amount: number;
          status?: 'pending' | 'active' | 'completed' | 'cancelled';
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string | null;
          pod_id?: string;
          console_id?: string;
          customer_phone?: string;
          start_time?: string;
          end_time?: string;
          duration_minutes?: number;
          payment_status?: 'pending' | 'paid';
          payment_amount?: number;
          status?: 'pending' | 'active' | 'completed' | 'cancelled';
          created_by?: string;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          role: 'admin' | 'staff';
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role?: 'admin' | 'staff';
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'admin' | 'staff';
          name?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      bookable_pods: {
        Row: {
          pod_id: string | null;
          pod_name: string | null;
          console_id: string | null;
          console_name: string | null;
          console_type: string | null;
        };
      };
    };
    Functions: {
      create_customer_booking: {
        Args: {
          selected_pod_id: string;
          booking_start: string;
          booking_end: string;
          booking_customer_name: string;
          booking_customer_phone: string;
          booking_notes?: string | null;
        };
        Returns: Database['public']['Tables']['bookings']['Row'];
      };
      get_available_pods: {
        Args: {
          booking_start: string;
          booking_end: string;
        };
        Returns: Database['public']['Views']['bookable_pods']['Row'][];
      };
      get_my_bookings: {
        Args: Record<PropertyKey, never>;
        Returns: Array<
          Database['public']['Tables']['bookings']['Row'] & {
            pod_name: string;
            console_name: string;
            console_type: string;
          }
        >;
      };
      activate_due_bookings: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
