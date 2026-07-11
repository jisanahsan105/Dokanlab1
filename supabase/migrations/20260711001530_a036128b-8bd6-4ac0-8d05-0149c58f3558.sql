ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS footer_terms_text TEXT,
  ADD COLUMN IF NOT EXISTS footer_warranty_text TEXT;