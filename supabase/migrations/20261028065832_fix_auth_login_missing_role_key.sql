/*
# Fix Auth Login — Add Missing 'role' Key to raw_app_meta_data

## Root Cause
All 3 demo users have raw_app_meta_data = {"provider":"email","providers":["email"]}
but are MISSING the "role" key. GoTrue requires raw_app_meta_data->>'role' to set
the JWT role claim. Without it, GoTrue throws "Database error querying schema"
during login because it cannot determine the user's authentication role.

This was the root cause of the persistent login error reported by the user.

## Fix
Update raw_app_meta_data for all 3 users to include the "role": "authenticated" key.
This is the standard role for all Supabase email/password users.

## Also fix
Add the role key in the admin_create_user function so new users get it too.
*/

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'authenticated'),
    updated_at = now()
WHERE email IN ('admin@nexusoms.vn', 'manager@nexusoms.vn', 'warehouse@nexusoms.vn');

-- Also update the admin_create_user function to include role in app metadata
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
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Khong co quyen: chi admin moi duoc tao nguoi dung' USING ERRCODE = '42501';
  END IF;

  INSERT INTO auth.users (
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud,
    role
  )
  VALUES (
    (SELECT id FROM auth.instances LIMIT 1),
    lower(p_email),
    crypt(p_password, gen_salt('bf', 10)),
    now(),
    jsonb_build_object('role', 'authenticated', 'provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    now(),
    now(),
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO v_new_user_id;

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

  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (v_new_user_id, lower(p_email), p_full_name, p_role, true)
  ON CONFLICT (id) DO NOTHING;

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
