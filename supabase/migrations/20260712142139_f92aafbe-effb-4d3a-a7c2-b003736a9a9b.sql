
-- 1) Orders validation trigger
CREATE OR REPLACE FUNCTION public.validate_order_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
BEGIN
  IF NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'product_id is required';
  END IF;
  SELECT id, store_id, price INTO p FROM public.products WHERE id = NEW.product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid product';
  END IF;
  IF p.store_id IS DISTINCT FROM NEW.store_id THEN
    RAISE EXCEPTION 'Product does not belong to store';
  END IF;
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;
  -- Enforce unit_price = product price (ignore any client-supplied price tampering)
  NEW.unit_price := p.price;
  -- Enforce total = unit_price * quantity + delivery_charge
  NEW.total := (p.price * NEW.quantity) + COALESCE(NEW.delivery_charge, 0);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.validate_order_row() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_order_row ON public.orders;
CREATE TRIGGER trg_validate_order_row
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_row();

-- 2) Storage upload ownership check
DROP POLICY IF EXISTS "store-assets auth upload" ON storage.objects;
CREATE POLICY "store-assets owner upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND s.owner_id = auth.uid()
  )
);
