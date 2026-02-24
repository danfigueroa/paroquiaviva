CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  candidate_username TEXT;
  suffix INTEGER := 1;
BEGIN
  base_username := NULLIF(LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9_]+', '', 'g')), '');
  IF base_username IS NULL THEN
    base_username := 'user_' || SUBSTRING(NEW.id::text, 1, 8);
  END IF;

  candidate_username := base_username;
  WHILE EXISTS (
    SELECT 1
    FROM public.users u
    WHERE LOWER(u.username) = LOWER(candidate_username)
      AND u.id <> NEW.id
      AND u.deleted_at IS NULL
  ) LOOP
    suffix := suffix + 1;
    candidate_username := base_username || '_' || suffix::text;
  END LOOP;

  INSERT INTO public.users (id, email, display_name, username)
  VALUES (NEW.id, NEW.email, COALESCE(NULLIF(SPLIT_PART(NEW.email, '@', 1), ''), 'new_user'), candidate_username)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();

  RETURN NEW;
END;
$$;
