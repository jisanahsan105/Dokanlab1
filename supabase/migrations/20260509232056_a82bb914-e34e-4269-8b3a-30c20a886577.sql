ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS delivery_inside_dhaka numeric(12,2) NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS delivery_outside_dhaka numeric(12,2) NOT NULL DEFAULT 100;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_area text,
  ADD COLUMN IF NOT EXISTS delivery_charge numeric(12,2) NOT NULL DEFAULT 0;