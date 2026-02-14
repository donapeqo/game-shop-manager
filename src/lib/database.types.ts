export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'staff'
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          role?: 'admin' | 'staff'
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'staff'
          name?: string
          created_at?: string
        }
      }
      consoles: {
        Row: {
          id: string
          name: string
          type: string
          status: 'available' | 'in_use' | 'maintenance'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          status?: 'available' | 'in_use' | 'maintenance'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          status?: 'available' | 'in_use' | 'maintenance'
          created_at?: string
        }
      }
      pods: {
        Row: {
          id: string
          name: string
          row: number
          col: number
          console_id: string | null
          status: 'available' | 'occupied' | 'payment_pending' | 'maintenance'
          current_session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          row: number
          col: number
          console_id?: string | null
          status?: 'available' | 'occupied' | 'payment_pending' | 'maintenance'
          current_session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          row?: number
          col?: number
          console_id?: string | null
          status?: 'available' | 'occupied' | 'payment_pending' | 'maintenance'
          current_session_id?: string | null
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          pod_id: string
          console_id: string
          customer_phone: string
          start_time: string
          end_time: string
          duration_minutes: number
          payment_status: 'pending' | 'paid'
          payment_amount: number
          status: 'pending' | 'active' | 'completed' | 'cancelled'
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          pod_id: string
          console_id: string
          customer_phone: string
          start_time: string
          end_time: string
          duration_minutes: number
          payment_status?: 'pending' | 'paid'
          payment_amount: number
          status?: 'pending' | 'active' | 'completed' | 'cancelled'
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          pod_id?: string
          console_id?: string
          customer_phone?: string
          start_time?: string
          end_time?: string
          duration_minutes?: number
          payment_status?: 'pending' | 'paid'
          payment_amount?: number
          status?: 'pending' | 'active' | 'completed' | 'cancelled'
          created_by?: string
          created_at?: string
        }
      }
      rental_history: {
        Row: {
          id: string
          session_id: string
          customer_phone: string
          pod_name: string
          console_name: string
          start_time: string
          end_time: string
          duration_minutes: number
          amount_paid: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          customer_phone: string
          pod_name: string
          console_name: string
          start_time: string
          end_time: string
          duration_minutes: number
          amount_paid: number
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          customer_phone?: string
          pod_name?: string
          console_name?: string
          start_time?: string
          end_time?: string
          duration_minutes?: number
          amount_paid?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
