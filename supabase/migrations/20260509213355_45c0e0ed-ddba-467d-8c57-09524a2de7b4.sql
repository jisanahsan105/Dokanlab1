ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS footer_address text,
  ADD COLUMN IF NOT EXISTS footer_email text,
  ADD COLUMN IF NOT EXISTS footer_phone text,
  ADD COLUMN IF NOT EXISTS footer_about_url text,
  ADD COLUMN IF NOT EXISTS footer_facebook_url text,
  ADD COLUMN IF NOT EXISTS footer_terms_url text,
  ADD COLUMN IF NOT EXISTS footer_warranty_url text,
  ADD COLUMN IF NOT EXISTS footer_playstore_url text,
  ADD COLUMN IF NOT EXISTS footer_appstore_url text,
  ADD COLUMN IF NOT EXISTS footer_copyright text;