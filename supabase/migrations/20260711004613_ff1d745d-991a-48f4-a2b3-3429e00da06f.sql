DROP FUNCTION IF EXISTS public.delete_store_cascade(UUID);

DROP POLICY IF EXISTS "stores owner delete" ON public.stores;
DROP POLICY IF EXISTS "Store owners and super admins delete stores" ON public.stores;
CREATE POLICY "Store owners and super admins delete stores"
  ON public.stores
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));