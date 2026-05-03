ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_booking_id ON public.sessions(booking_id);

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

GRANT EXECUTE ON FUNCTION public.activate_due_bookings() TO authenticated;
