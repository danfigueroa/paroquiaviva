CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
BEGIN
  base_username := NULLIF(LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9_]+', '', 'g')), '');
  IF base_username IS NULL THEN
    base_username := 'user_' || SUBSTRING(NEW.id::text, 1, 8);
  END IF;

  INSERT INTO public.users (id, email, display_name, username)
  VALUES (NEW.id, NEW.email, COALESCE(NULLIF(SPLIT_PART(NEW.email, '@', 1), ''), 'new_user'), base_username)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();
  RETURN NEW;
END;
$$;
