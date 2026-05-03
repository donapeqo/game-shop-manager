DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.canvas_settings;

CREATE POLICY "Staff can manage canvas settings" ON public.canvas_settings
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());
