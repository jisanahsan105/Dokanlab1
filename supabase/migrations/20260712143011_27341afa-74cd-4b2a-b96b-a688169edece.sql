
-- 1) Columns
ALTER TABLE public.store_messages
  ADD COLUMN IF NOT EXISTS sender text NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS conversation_id uuid;

ALTER TABLE public.store_messages
  DROP CONSTRAINT IF EXISTS store_messages_sender_check;
ALTER TABLE public.store_messages
  ADD CONSTRAINT store_messages_sender_check CHECK (sender IN ('customer','owner','system'));

CREATE INDEX IF NOT EXISTS idx_store_messages_conv
  ON public.store_messages (store_id, conversation_id, created_at);

-- Backfill: give every existing customer row a conversation_id so history shows up as a thread.
UPDATE public.store_messages
  SET conversation_id = gen_random_uuid()
  WHERE conversation_id IS NULL;

-- 2) RPCs for anonymous storefront chat (bounded, safe)

-- Fetch messages in a specific conversation (customer must know the uuid).
CREATE OR REPLACE FUNCTION public.chat_get_conversation(_store_id uuid, _conv_id uuid)
RETURNS TABLE (
  id uuid,
  sender text,
  message text,
  seen boolean,
  seen_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.sender, m.message, m.seen, m.seen_at, m.created_at
  FROM public.store_messages m
  WHERE m.store_id = _store_id AND m.conversation_id = _conv_id
  ORDER BY m.created_at ASC
  LIMIT 500;
$$;
REVOKE ALL ON FUNCTION public.chat_get_conversation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chat_get_conversation(uuid, uuid) TO anon, authenticated;

-- Customer sends a message.
CREATE OR REPLACE FUNCTION public.chat_customer_send(
  _store_id uuid,
  _conv_id uuid,
  _name text,
  _phone text,
  _email text,
  _message text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF _store_id IS NULL OR _conv_id IS NULL THEN
    RAISE EXCEPTION 'store_id and conversation_id are required';
  END IF;
  IF _message IS NULL OR length(trim(_message)) = 0 THEN
    RAISE EXCEPTION 'message required';
  END IF;
  IF length(_message) > 4000 THEN
    RAISE EXCEPTION 'message too long';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id) THEN
    RAISE EXCEPTION 'invalid store';
  END IF;
  INSERT INTO public.store_messages
    (store_id, conversation_id, sender, customer_name, customer_phone, customer_email, message, source, seen)
  VALUES
    (_store_id, _conv_id, 'customer',
     NULLIF(trim(_name), ''), NULLIF(trim(_phone), ''), NULLIF(trim(_email), ''),
     trim(_message), 'storefront', false)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.chat_customer_send(uuid, uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chat_customer_send(uuid, uuid, text, text, text, text) TO anon, authenticated;

-- Customer marks owner messages in the conversation as seen.
CREATE OR REPLACE FUNCTION public.chat_customer_mark_seen(_store_id uuid, _conv_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.store_messages
    SET seen = true, seen_at = now()
    WHERE store_id = _store_id
      AND conversation_id = _conv_id
      AND sender = 'owner'
      AND seen = false;
$$;
REVOKE ALL ON FUNCTION public.chat_customer_mark_seen(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chat_customer_mark_seen(uuid, uuid) TO anon, authenticated;

-- 3) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_messages;
