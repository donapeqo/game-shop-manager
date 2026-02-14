-- Enable RLS
alter table if exists public.users enable row level security;
alter table if exists public.consoles enable row level security;
alter table if exists public.pods enable row level security;
alter table if exists public.sessions enable row level security;
alter table if exists public.rental_history enable row level security;

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consoles table
CREATE TABLE IF NOT EXISTS public.consoles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'in_use', 'maintenance')) DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pods table
CREATE TABLE IF NOT EXISTS public.pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  row INTEGER NOT NULL,
  col INTEGER NOT NULL,
  console_id UUID REFERENCES public.consoles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'occupied', 'payment_pending', 'maintenance')) DEFAULT 'available',
  current_session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(row, col)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  console_id UUID NOT NULL REFERENCES public.consoles(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid')) DEFAULT 'pending',
  payment_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled')) DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rental history table
CREATE TABLE IF NOT EXISTS public.rental_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  pod_name TEXT NOT NULL,
  console_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies

-- Users: Allow all authenticated users to read
CREATE POLICY "Allow read access to all authenticated users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Consoles: Allow all authenticated users full access
CREATE POLICY "Allow full access to authenticated users" ON public.consoles
  FOR ALL USING (auth.role() = 'authenticated');

-- Pods: Allow all authenticated users full access
CREATE POLICY "Allow full access to authenticated users" ON public.pods
  FOR ALL USING (auth.role() = 'authenticated');

-- Sessions: Allow all authenticated users full access
CREATE POLICY "Allow full access to authenticated users" ON public.sessions
  FOR ALL USING (auth.role() = 'authenticated');

-- Rental history: Allow all authenticated users full access
CREATE POLICY "Allow full access to authenticated users" ON public.rental_history
  FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pods_status ON public.pods(status);
CREATE INDEX IF NOT EXISTS idx_pods_session ON public.pods(current_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_pod ON public.sessions(pod_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_phone ON public.sessions(customer_phone);
CREATE INDEX IF NOT EXISTS idx_rental_phone ON public.rental_history(customer_phone);

-- Enable realtime for all tables
alter publication supabase_realtime add table public.pods;
alter publication supabase_realtime add table public.sessions;
