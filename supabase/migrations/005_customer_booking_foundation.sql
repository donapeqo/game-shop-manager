CREATE EXTENSION IF NOT EXISTS btree_gist;

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

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pod_id ON public.bookings(pod_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON public.bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap_per_pod
  EXCLUDE USING gist (
    pod_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  )
  WHERE (status IN ('reserved', 'confirmed', 'checked_in'));

DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.users;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.consoles;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.pods;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.sessions;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.rental_history;

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

GRANT SELECT ON public.bookable_pods TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_pods(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_bookings() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_booking_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_updated_at();

alter publication supabase_realtime add table public.bookings;
