export interface User {
  id: string;
  email: string;
  role: 'admin' | 'staff';
  name: string;
}

export interface Console {
  id: string;
  name: string;
  type: 'ps5' | 'xbox' | 'switch' | 'pc' | string;
  status: 'available' | 'in_use' | 'maintenance';
}

export interface Pod {
  id: string;
  name: string;
  row: number;
  col: number;
  console_id: string | null;
  status: 'available' | 'occupied' | 'payment_pending' | 'maintenance';
  current_session_id: string | null;
}

export interface Session {
  id: string;
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
}

export interface RentalHistory {
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
}

export type PodStatus = 'available' | 'occupied' | 'payment_pending' | 'maintenance';
export type SessionStatus = 'pending' | 'active' | 'completed' | 'cancelled';
