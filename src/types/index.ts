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
  // Canvas positioning fields
  canvas_x: number;
  canvas_y: number;
  canvas_width: number;
  canvas_height: number;
  // Optional Tuya local control fields
  tuya_enabled?: boolean;
  tuya_device_id?: string | null;
  tuya_ip_address?: string | null;
  tuya_protocol_version?: string | null;
}

export type ViewMode = 'grid' | 'list';

export type PodSizePreset = 'small' | 'medium' | 'large';

export interface CanvasPosition {
  x: number;
  y: number;
  width: number;
  height: number;
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

export type SortField = 'name' | 'console' | 'status' | 'customer' | 'timeLeft';
export type SortDirection = 'asc' | 'desc';

export interface CanvasSettings {
  id: string;
  background_image: string | null;
  canvas_width: number;
  canvas_height: number;
  created_at: string;
  updated_at: string;
}
