ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS site_status text,
  ADD COLUMN IF NOT EXISTS site_status_message text,
  ADD COLUMN IF NOT EXISTS site_status_checked_at timestamptz;