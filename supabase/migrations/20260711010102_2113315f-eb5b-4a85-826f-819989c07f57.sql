
CREATE OR REPLACE FUNCTION public.is_store_active(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stores s
    JOIN public.profiles p ON p.id = s.owner_id
    WHERE s.id = _store_id
      AND p.access_status = 'approved'
      AND p.subscription_valid_until IS NOT NULL
      AND p.subscription_valid_until > now()
  );
$$;

REVOKE ALL ON FUNCTION public.is_store_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_store_active(uuid) TO anon, authenticated;
