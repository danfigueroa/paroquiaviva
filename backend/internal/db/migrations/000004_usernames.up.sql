ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE users
SET username = NULLIF(LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-z0-9_]+', '', 'g')), '')
WHERE username IS NULL;

UPDATE users
SET username = 'user_' || SUBSTRING(id::text, 1, 8)
WHERE username IS NULL OR username = '';

WITH ranked AS (
  SELECT id,
         username,
         ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at, id) AS rn
  FROM users
)
UPDATE users u
SET username = ranked.username || '_' || ranked.rn::text
FROM ranked
WHERE u.id = ranked.id AND ranked.rn > 1;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique
ON users (LOWER(username))
WHERE deleted_at IS NULL;

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
