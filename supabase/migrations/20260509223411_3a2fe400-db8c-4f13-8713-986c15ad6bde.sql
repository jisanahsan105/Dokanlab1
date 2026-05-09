
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS domain_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS domain_last_check_error text;
