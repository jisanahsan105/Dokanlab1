
-- 1) Add welcome message setting for super admin
ALTER TABLE public.admin_payment_settings
  ADD COLUMN IF NOT EXISTS welcome_message text
  DEFAULT 'স্বাগতম DokanLab-এ! আপনার অ্যাকাউন্ট অ্যাপ্রুভ হয়েছে। শুরু করতে এখানে ক্লিক করুন: https://f-commerce-boutique.lovable.app/dashboard';

-- Ensure at least one row exists
INSERT INTO public.admin_payment_settings (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- 2) Allow user-scoped messages (welcome messages) in store_messages
ALTER TABLE public.store_messages
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.store_messages ALTER COLUMN store_id DROP NOT NULL;

-- 3) RLS: user can view their own user-scoped messages
DROP POLICY IF EXISTS "Users can view their own user-scoped messages" ON public.store_messages;
CREATE POLICY "Users can view their own user-scoped messages"
ON public.store_messages FOR SELECT
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own user-scoped messages" ON public.store_messages;
CREATE POLICY "Users can update their own user-scoped messages"
ON public.store_messages FOR UPDATE
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid())
WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own user-scoped messages" ON public.store_messages;
CREATE POLICY "Users can delete their own user-scoped messages"
ON public.store_messages FOR DELETE
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());

-- 4) Trigger: when access_status flips to 'approved', drop a welcome message
CREATE OR REPLACE FUNCTION public.send_welcome_message_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg text;
BEGIN
  IF NEW.access_status = 'approved' AND (OLD.access_status IS DISTINCT FROM 'approved') THEN
    SELECT welcome_message INTO msg FROM public.admin_payment_settings LIMIT 1;
    IF msg IS NULL OR length(trim(msg)) = 0 THEN
      msg := 'স্বাগতম DokanLab-এ! আপনার অ্যাকাউন্ট অ্যাপ্রুভ হয়েছে।';
    END IF;
    INSERT INTO public.store_messages (user_id, customer_name, message, source, seen)
    VALUES (NEW.id, 'DokanLab Team', msg, 'system', false);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_send_welcome_message ON public.profiles;
CREATE TRIGGER trg_send_welcome_message
AFTER UPDATE OF access_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.send_welcome_message_on_approval();
