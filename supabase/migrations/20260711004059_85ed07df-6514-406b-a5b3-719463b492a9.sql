CREATE TABLE public.store_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  message TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'storefront',
  seen BOOLEAN NOT NULL DEFAULT false,
  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_messages TO authenticated;
GRANT INSERT ON public.store_messages TO anon;
GRANT ALL ON public.store_messages TO service_role;

ALTER TABLE public.store_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can send storefront messages"
  ON public.store_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (message IS NOT NULL AND length(trim(message)) > 0);

CREATE POLICY "Store owners and super admins read messages"
  ON public.store_messages
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_messages.store_id
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Store owners and super admins update messages"
  ON public.store_messages
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_messages.store_id
        AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_messages.store_id
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Store owners and super admins delete messages"
  ON public.store_messages
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_messages.store_id
        AND s.owner_id = auth.uid()
    )
  );

CREATE INDEX idx_store_messages_store_created ON public.store_messages(store_id, created_at DESC);
CREATE INDEX idx_store_messages_store_seen ON public.store_messages(store_id, seen);

CREATE OR REPLACE FUNCTION public.mark_store_message_seen_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.seen = true AND OLD.seen IS DISTINCT FROM true THEN
    NEW.seen_at = now();
  ELSIF NEW.seen = false THEN
    NEW.seen_at = NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_store_messages_seen_at
  BEFORE UPDATE ON public.store_messages
  FOR EACH ROW EXECUTE FUNCTION public.mark_store_message_seen_at();

CREATE OR REPLACE FUNCTION public.delete_store_cascade(_store_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = _store_id
      AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  ) THEN
    RAISE EXCEPTION 'Not allowed to delete this store';
  END IF;

  DELETE FROM public.stores WHERE id = _store_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_store_cascade(UUID) TO authenticated;