/*
# Admin User Management — SECURITY DEFINER functions

## Purpose
The `profiles` table has an UPDATE policy that only allows users to update their own row (`auth.uid() = id`).
This means admins cannot change other users' roles or active status from the frontend.
Additionally, `auth.users` cannot be inserted from the client — only Supabase Auth can create users.

## Changes

### 1. `admin_create_user(p_email, p_password, p_full_name, p_role)`
SECURITY DEFINER function callable only by admins.
- Creates a new auth user via `auth.users` insert (with encrypted password)
- The existing `on_auth_user_created` trigger auto-creates the matching `profiles` row
- Then sets the correct role on the profile (trigger defaults to 'warehouse')
- Returns the new user's UUID

### 2. `admin_update_profile(p_user_id, p_role, p_is_active)`
SECURITY DEFINER function callable only by admins.
- Updates the `role` and `is_active` fields of ANY profile
- Bypasses the `auth.uid() = id` RLS restriction for admin users

### Security
- Both functions check `auth.uid()` exists and has role = 'admin' in profiles
- EXECUTE revoked from PUBLIC and anon; granted only to authenticated
- search_path pinned to public, auth
*/

-- ---------- admin_create_user ----------
CREATE OR REPLACE FUNCTION admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text DEFAULT 'warehouse'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_user_id uuid;
  valid_roles text[] := ARRAY['admin','manager','warehouse'];
BEGIN
  -- Only admins can create users
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;

  -- Validate role
  IF NOT (p_role = ANY(valid_roles)) THEN
    RAISE EXCEPTION 'Invalid role: must be admin, manager, or warehouse';
  END IF;

  -- Validate password length
  IF length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email already registered';
  END IF;

  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud,
    role
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    now(),
    now(),
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO new_user_id;

  -- Update the profile that the trigger created with the correct role
  UPDATE profiles
  SET role = p_role, full_name = p_full_name
  WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_create_user(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_create_user(text, text, text, text) TO authenticated;

-- ---------- admin_update_profile ----------
CREATE OR REPLACE FUNCTION admin_update_profile(
  p_user_id uuid,
  p_role text,
  p_is_active boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_roles text[] := ARRAY['admin','manager','warehouse'];
BEGIN
  -- Only admins can update profiles
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;

  -- Validate role
  IF NOT (p_role = ANY(valid_roles)) THEN
    RAISE EXCEPTION 'Invalid role: must be admin, manager, or warehouse';
  END IF;

  -- Update the target profile
  UPDATE profiles
  SET role = p_role, is_active = p_is_active, updated_at = now()
  WHERE id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_update_profile(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_update_profile(uuid, text, boolean) TO authenticated;
