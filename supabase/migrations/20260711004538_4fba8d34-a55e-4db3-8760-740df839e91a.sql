DROP POLICY IF EXISTS "Anyone can send storefront messages" ON public.store_messages;
CREATE POLICY "Anyone can send storefront messages"
  ON public.store_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(message)) > 0
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_messages.store_id
    )
  );

ALTER FUNCTION public.delete_store_cascade(UUID) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.delete_store_cascade(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_store_cascade(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_store_cascade(UUID) FROM service_role;
GRANT EXECUTE ON FUNCTION public.delete_store_cascade(UUID) TO authenticated;