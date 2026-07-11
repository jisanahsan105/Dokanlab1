
-- Admin payment receiving settings (single row)
CREATE TABLE public.admin_payment_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  bkash_number TEXT,
  nagad_number TEXT,
  rocket_number TEXT,
  bank_details TEXT,
  self_serve_amount NUMERIC NOT NULL DEFAULT 499,
  done_for_you_first_amount NUMERIC NOT NULL DEFAULT 999,
  done_for_you_recurring_amount NUMERIC NOT NULL DEFAULT 499,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (id = 'default')
);

GRANT SELECT ON public.admin_payment_settings TO authenticated;
GRANT ALL ON public.admin_payment_settings TO service_role;
ALTER TABLE public.admin_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read admin payment settings"
  ON public.admin_payment_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages admin payment settings"
  ON public.admin_payment_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.admin_payment_settings (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- Subscription payments (user-submitted proof)
CREATE TABLE public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('self_serve','done_for_you')),
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bkash','nagad','rocket','bank','other')),
  transaction_id TEXT NOT NULL,
  sender_number TEXT,
  screenshot_url TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners insert own submissions" ON public.subscription_payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners read own submissions" ON public.subscription_payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admin reads all submissions" ON public.subscription_payments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin updates submissions" ON public.subscription_payments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_sub_payments_user ON public.subscription_payments(user_id);
CREATE INDEX idx_sub_payments_status ON public.subscription_payments(status);

-- Updated_at trigger reuse
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_sub_payments_updated BEFORE UPDATE ON public.subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_admin_pay_settings_updated BEFORE UPDATE ON public.admin_payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Subscription tracking on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT CHECK (subscription_plan IN ('self_serve','done_for_you')),
  ADD COLUMN IF NOT EXISTS subscription_valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','expired'));

-- On approve, auto-extend the user's plan by 30 days
CREATE OR REPLACE FUNCTION public.apply_approved_subscription_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT GREATEST(COALESCE(subscription_valid_until, now()), now()) INTO base
      FROM public.profiles WHERE id = NEW.user_id;
    UPDATE public.profiles
      SET subscription_plan = NEW.plan,
          subscription_valid_until = base + interval '30 days',
          subscription_status = 'active',
          access_status = CASE WHEN access_status = 'blocked' THEN access_status ELSE 'approved' END
      WHERE id = NEW.user_id;
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_apply_sub_payment
  BEFORE UPDATE ON public.subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_approved_subscription_payment();
