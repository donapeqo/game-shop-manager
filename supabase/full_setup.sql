-- Full setup script for a fresh Supabase project.
-- Run this once on an empty database instead of applying 001-007 individually.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Core tables
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.consoles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'in_use', 'maintenance')) DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  row INTEGER NOT NULL,
  col INTEGER NOT NULL,
  console_id UUID REFERENCES public.consoles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'occupied', 'payment_pending', 'maintenance')) DEFAULT 'available',
  current_session_id UUID,
  canvas_x INTEGER DEFAULT 0,
  canvas_y INTEGER DEFAULT 0,
  canvas_width INTEGER DEFAULT 200,
  canvas_height INTEGER DEFAULT 150,
  tuya_enabled BOOLEAN DEFAULT FALSE,
  tuya_device_id TEXT,
  tuya_ip_address TEXT,
  tuya_protocol_version TEXT DEFAULT '3.5',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
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

CREATE TABLE IF NOT EXISTS public.canvas_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  background_image TEXT,
  canvas_width INTEGER DEFAULT 1200,
  canvas_height INTEGER DEFAULT 800,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  pod_id UUID NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  console_id UUID NOT NULL REFERENCES public.consoles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  status TEXT NOT NULL CHECK (status IN ('reserved', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show')) DEFAULT 'confirmed',
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_time > start_time)
);

-- Post-create constraints that depend on later tables
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_booking_id_fkey;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_booking_id_fkey
  FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_no_overlap_per_pod;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap_per_pod
  EXCLUDE USING gist (
    pod_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  )
  WHERE (status IN ('reserved', 'confirmed', 'checked_in'));

-- Seed default canvas settings
INSERT INTO public.canvas_settings (id, background_image, canvas_width, canvas_height)
SELECT gen_random_uuid(), NULL, 1200, 800
WHERE NOT EXISTS (SELECT 1 FROM public.canvas_settings);

-- Comments
COMMENT ON COLUMN public.pods.canvas_x IS 'X position on canvas (pixels)';
COMMENT ON COLUMN public.pods.canvas_y IS 'Y position on canvas (pixels)';
COMMENT ON COLUMN public.pods.canvas_width IS 'Width of pod card on canvas (pixels)';
COMMENT ON COLUMN public.pods.canvas_height IS 'Height of pod card on canvas (pixels)';
COMMENT ON COLUMN public.pods.tuya_enabled IS 'Whether local Tuya control is enabled for this pod';
COMMENT ON COLUMN public.pods.tuya_device_id IS 'Tuya device ID used by local gateway';
COMMENT ON COLUMN public.pods.tuya_ip_address IS 'Local IPv4 of the Tuya smart plug';
COMMENT ON COLUMN public.pods.tuya_protocol_version IS 'Tuya protocol version (e.g. 3.3, 3.4, 3.5)';
COMMENT ON TABLE public.canvas_settings IS 'Global canvas configuration including background image';
COMMENT ON COLUMN public.canvas_settings.background_image IS 'Base64 encoded background image for the canvas';

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
  );
$$;

-- Views
CREATE OR REPLACE VIEW public.bookable_pods AS
SELECT
  pods.id AS pod_id,
  pods.name AS pod_name,
  consoles.id AS console_id,
  consoles.name AS console_name,
  consoles.type AS console_type
FROM public.pods
JOIN public.consoles ON consoles.id = pods.console_id
WHERE pods.status <> 'maintenance'
  AND consoles.status <> 'maintenance';

CREATE OR REPLACE FUNCTION public.get_available_pods(booking_start TIMESTAMPTZ, booking_end TIMESTAMPTZ)
RETURNS TABLE (
  pod_id UUID,
  pod_name TEXT,
  console_id UUID,
  console_name TEXT,
  console_type TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bp.pod_id, bp.pod_name, bp.console_id, bp.console_name, bp.console_type
  FROM public.bookable_pods bp
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.pod_id = bp.pod_id
      AND b.status IN ('reserved', 'confirmed', 'checked_in')
      AND b.start_time < booking_end
      AND b.end_time > booking_start
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.pod_id = bp.pod_id
      AND s.status IN ('pending', 'active')
      AND s.start_time < booking_end
      AND s.end_time > booking_start
  )
  ORDER BY bp.pod_name;
$$;

CREATE OR REPLACE FUNCTION public.create_customer_booking(
  selected_pod_id UUID,
  booking_start TIMESTAMPTZ,
  booking_end TIMESTAMPTZ,
  booking_customer_name TEXT,
  booking_customer_phone TEXT,
  booking_notes TEXT DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record public.customer_profiles%ROWTYPE;
  pod_console_id UUID;
  inserted_booking public.bookings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF booking_end <= booking_start THEN
    RAISE EXCEPTION 'End time must be later than start time';
  END IF;

  SELECT *
  INTO profile_record
  FROM public.customer_profiles
  WHERE id = auth.uid();

  IF profile_record.id IS NULL THEN
    RAISE EXCEPTION 'Customer profile not found';
  END IF;

  SELECT console_id
  INTO pod_console_id
  FROM public.pods
  WHERE id = selected_pod_id
    AND status <> 'maintenance';

  IF pod_console_id IS NULL THEN
    RAISE EXCEPTION 'Selected pod is not available for booking';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.pod_id = selected_pod_id
      AND b.status IN ('reserved', 'confirmed', 'checked_in')
      AND b.start_time < booking_end
      AND b.end_time > booking_start
  ) THEN
    RAISE EXCEPTION 'Selected pod is no longer available for that slot';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.pod_id = selected_pod_id
      AND s.status IN ('pending', 'active')
      AND s.start_time < booking_end
      AND s.end_time > booking_start
  ) THEN
    RAISE EXCEPTION 'Selected pod is already tied to another session for that time';
  END IF;

  INSERT INTO public.bookings (
    customer_id,
    pod_id,
    console_id,
    customer_name,
    customer_phone,
    start_time,
    end_time,
    duration_minutes,
    status,
    payment_status,
    notes
  )
  VALUES (
    auth.uid(),
    selected_pod_id,
    pod_console_id,
    booking_customer_name,
    booking_customer_phone,
    booking_start,
    booking_end,
    GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (booking_end - booking_start)) / 60))::INTEGER,
    'confirmed',
    'pending',
    booking_notes
  )
  RETURNING * INTO inserted_booking;

  RETURN inserted_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_bookings()
RETURNS TABLE (
  id UUID,
  customer_id UUID,
  pod_id UUID,
  console_id UUID,
  pod_name TEXT,
  console_name TEXT,
  console_type TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  status TEXT,
  payment_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.customer_id,
    b.pod_id,
    b.console_id,
    p.name AS pod_name,
    c.name AS console_name,
    c.type AS console_type,
    b.customer_name,
    b.customer_phone,
    b.start_time,
    b.end_time,
    b.duration_minutes,
    b.status,
    b.payment_status,
    b.notes,
    b.created_at,
    b.updated_at
  FROM public.bookings b
  JOIN public.pods p ON p.id = b.pod_id
  JOIN public.consoles c ON c.id = b.console_id
  WHERE b.customer_id = auth.uid()
  ORDER BY b.start_time;
$$;

CREATE OR REPLACE FUNCTION public.activate_due_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_record public.bookings%ROWTYPE;
  created_session_id UUID;
  activated_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff() THEN
    RAISE EXCEPTION 'Staff authentication required';
  END IF;

  FOR booking_record IN
    SELECT b.*
    FROM public.bookings b
    JOIN public.pods p ON p.id = b.pod_id
    WHERE b.status = 'confirmed'
      AND b.start_time <= NOW()
      AND p.current_session_id IS NULL
      AND p.status = 'available'
      AND NOT EXISTS (
        SELECT 1
        FROM public.sessions s
        WHERE s.booking_id = b.id
      )
    ORDER BY b.start_time
    FOR UPDATE OF b SKIP LOCKED
  LOOP
    INSERT INTO public.sessions (
      booking_id,
      pod_id,
      console_id,
      customer_phone,
      start_time,
      end_time,
      duration_minutes,
      payment_status,
      payment_amount,
      status,
      created_by
    )
    VALUES (
      booking_record.id,
      booking_record.pod_id,
      booking_record.console_id,
      booking_record.customer_phone,
      booking_record.start_time,
      booking_record.end_time,
      booking_record.duration_minutes,
      'pending',
      0,
      'pending',
      auth.uid()
    )
    RETURNING id INTO created_session_id;

    UPDATE public.pods
    SET
      status = 'payment_pending',
      current_session_id = created_session_id
    WHERE id = booking_record.pod_id;

    UPDATE public.bookings
    SET
      status = 'checked_in',
      updated_at = NOW()
    WHERE id = booking_record.id;

    activated_count := activated_count + 1;
  END LOOP;

  RETURN activated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_booking_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers
DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pods_status ON public.pods(status);
CREATE INDEX IF NOT EXISTS idx_pods_session ON public.pods(current_session_id);
CREATE INDEX IF NOT EXISTS idx_pods_canvas ON public.pods(canvas_x, canvas_y);
CREATE INDEX IF NOT EXISTS idx_pods_tuya_enabled ON public.pods(tuya_enabled);
CREATE INDEX IF NOT EXISTS idx_sessions_pod ON public.sessions(pod_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_phone ON public.sessions(customer_phone);
CREATE INDEX IF NOT EXISTS idx_sessions_booking_id ON public.sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_rental_phone ON public.rental_history(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pod_id ON public.bookings(pod_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON public.bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.users;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.consoles;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.pods;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.sessions;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.rental_history;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.canvas_settings;
DROP POLICY IF EXISTS "Staff can manage users" ON public.users;
DROP POLICY IF EXISTS "Staff can manage consoles" ON public.consoles;
DROP POLICY IF EXISTS "Staff can manage pods" ON public.pods;
DROP POLICY IF EXISTS "Staff can manage sessions" ON public.sessions;
DROP POLICY IF EXISTS "Staff can manage rental history" ON public.rental_history;
DROP POLICY IF EXISTS "Staff can manage canvas settings" ON public.canvas_settings;
DROP POLICY IF EXISTS "Customers can read their profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can create their profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can update their profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Staff can manage customer profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can read their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff can manage bookings" ON public.bookings;

CREATE POLICY "Staff can manage users" ON public.users
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Staff can manage consoles" ON public.consoles
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Staff can manage pods" ON public.pods
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Staff can manage sessions" ON public.sessions
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Staff can manage rental history" ON public.rental_history
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Staff can manage canvas settings" ON public.canvas_settings
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Customers can read their profile" ON public.customer_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Customers can create their profile" ON public.customer_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Customers can update their profile" ON public.customer_profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Staff can manage customer profiles" ON public.customer_profiles
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Customers can read their bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Staff can manage bookings" ON public.bookings
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Grants
GRANT SELECT ON public.bookable_pods TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_pods(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_bookings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_due_bookings() TO authenticated;

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pods'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pods;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END $$;
