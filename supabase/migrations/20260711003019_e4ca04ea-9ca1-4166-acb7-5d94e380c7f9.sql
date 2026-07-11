
-- Roles enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('super_admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Policies for user_roles
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admin reads all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manages roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Access status on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (access_status IN ('pending','approved','blocked'));

-- Existing users grandfather: only if they already own a store, mark approved
UPDATE public.profiles p SET access_status = 'approved'
WHERE EXISTS (SELECT 1 FROM public.stores s WHERE s.owner_id = p.id);

-- Grant super_admin to the designated email if that user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::app_role FROM auth.users u
WHERE lower(u.email) = 'urmi7529@gmail.com'
ON CONFLICT DO NOTHING;

-- Also ensure super admin's profile is approved
UPDATE public.profiles SET access_status = 'approved'
WHERE id IN (SELECT id FROM auth.users WHERE lower(email) = 'urmi7529@gmail.com');

-- Trigger: auto-grant super_admin role on signup for the designated email
CREATE OR REPLACE FUNCTION public.grant_super_admin_by_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'urmi7529@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET access_status = 'approved' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_super_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_super_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin_by_email();

-- Super admin can view all profiles and update access_status
CREATE POLICY "Super admin reads all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin updates all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Restrict store creation to approved users (or super admin)
DROP POLICY IF EXISTS "Users can insert own stores" ON public.stores;
DROP POLICY IF EXISTS "Owners insert own stores" ON public.stores;
CREATE POLICY "Approved users insert own stores" ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.access_status = 'approved'
      )
    )
  );
