
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS product_whatsapp_url text;

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT, INSERT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved reviews" ON public.reviews
  FOR SELECT USING (approved = true);

CREATE POLICY "Anyone can submit a review" ON public.reviews
  FOR INSERT WITH CHECK (approved = false);

CREATE POLICY "Store owner can read all their reviews" ON public.reviews
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = reviews.store_id AND s.owner_id = auth.uid()));

CREATE POLICY "Store owner can update their reviews" ON public.reviews
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = reviews.store_id AND s.owner_id = auth.uid()));

CREATE POLICY "Store owner can delete their reviews" ON public.reviews
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = reviews.store_id AND s.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS reviews_product_approved_idx ON public.reviews(product_id, approved);
CREATE INDEX IF NOT EXISTS reviews_store_idx ON public.reviews(store_id);
