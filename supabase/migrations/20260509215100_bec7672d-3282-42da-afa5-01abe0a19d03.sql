
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories public read"
ON public.categories FOR SELECT USING (true);

CREATE POLICY "categories owner insert"
ON public.categories FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = categories.store_id AND s.owner_id = auth.uid()));

CREATE POLICY "categories owner update"
ON public.categories FOR UPDATE
USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = categories.store_id AND s.owner_id = auth.uid()));

CREATE POLICY "categories owner delete"
ON public.categories FOR DELETE
USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = categories.store_id AND s.owner_id = auth.uid()));

ALTER TABLE public.products ADD COLUMN category_id uuid;
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_categories_store_position ON public.categories(store_id, position);
