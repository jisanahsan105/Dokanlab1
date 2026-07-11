GRANT SELECT (self_serve_amount, done_for_you_first_amount, done_for_you_recurring_amount) ON public.admin_payment_settings TO anon;

DROP POLICY IF EXISTS "Public can read package prices" ON public.admin_payment_settings;
CREATE POLICY "Public can read package prices"
  ON public.admin_payment_settings
  FOR SELECT
  TO anon
  USING (id = 'default');

REVOKE EXECUTE ON FUNCTION public.delete_store_cascade(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_store_cascade(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_store_cascade(UUID) TO authenticated;