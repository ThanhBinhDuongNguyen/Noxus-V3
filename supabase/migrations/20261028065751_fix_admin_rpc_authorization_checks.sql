/*
# Fix Admin RPC Regression — Add Internal Authorization Checks

## Summary
The previous migration restricted admin_create_user and admin_update_profile to service_role only.
This broke the SettingsPage admin UI which calls these functions via .rpc() from the browser.
This migration re-grants EXECUTE to authenticated but adds internal authorization:
the functions now check that the calling user has 'admin' role in their profile before proceeding.

## Changes
1. admin_create_user — re-grant EXECUTE to authenticated, add admin role check
2. admin_update_profile — re-grant EXECUTE to authenticated, add admin role check
3. Both functions now raise an exception if the caller is not an admin

## Security
- Functions remain SECURITY DEFINER (they need elevated privileges to create/modify users)
- Internal authorization check ensures only admin-role users can call them
- search_path is set to 'public' (no injection risk)
*/

-- Re-grant EXECUTE to authenticated
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, boolean) TO authenticated;

-- Recreate admin_create_user with authorization check
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text DEFAULT 'warehouse'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text;
  v_new_user_id uuid;
BEGIN
  -- Authorization: only admins can create users
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Khong co quyen: chi admin moi duoc tao nguoi dung' USING ERRCODE = '42501';
  END IF;

  -- Create the auth user using the Admin API approach via Supabase
  -- We use auth.users insert with proper fields
  INSERT INTO auth.users (
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud
  )
  VALUES (
    (SELECT id FROM auth.instances LIMIT 1),
    lower(p_email),
    crypt(p_password, gen_salt('bf', 10)),
    now(),
    jsonb_build_object('role', p_role, 'provider', 'email'),
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    now(),
    now(),
    'authenticated'
  )
  RETURNING id INTO v_new_user_id;

  -- Insert identity
  INSERT INTO auth.identities (
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at
  )
  VALUES (
    v_new_user_id,
    jsonb_build_object('sub', v_new_user_id::text, 'email', lower(p_email)),
    'email',
    now(),
    now()
  );

  -- Insert profile (handle_new_user trigger may also do this, but ON CONFLICT DO NOTHING handles it)
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (v_new_user_id, lower(p_email), p_full_name, p_role, true)
  ON CONFLICT (id) DO NOTHING;

  -- Auto-assign to default tenant
  INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
  VALUES (
    (SELECT id FROM public.tenants ORDER BY created_at LIMIT 1),
    v_new_user_id,
    CASE WHEN p_role = 'admin' THEN 'admin' ELSE 'warehouse' END,
    'active'
  )
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  RETURN v_new_user_id;
END;
$$;

-- Recreate admin_update_profile with authorization check
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_user_id uuid,
  p_role text,
  p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Authorization: only admins can update profiles
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Khong co quyen: chi admin moi duoc cap nhat nguoi dung' USING ERRCODE = '42501';
  END IF;

  -- Update the profile
  UPDATE public.profiles
  SET role = p_role,
      is_active = p_is_active,
      updated_at = now()
  WHERE id = p_user_id;

  -- Update auth.users app metadata to keep in sync
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(p_role)
  ),
  updated_at = now()
  WHERE id = p_user_id;
END;
$$;
