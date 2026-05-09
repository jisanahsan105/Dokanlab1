
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DROP POLICY "store-assets public read" ON storage.objects;
CREATE POLICY "store-assets public object read" ON storage.objects FOR SELECT USING (bucket_id = 'store-assets' AND name IS NOT NULL);
