/*
# Fix: Recreate demo users properly via direct SQL insert

`confirmed_at` and identities.email are generated columns — cannot insert directly.
*/

DO $$
DECLARE
  v_admin_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_mgr_id  uuid := 'a0000000-0000-0000-0000-000000000002';
  v_wh_id   uuid := 'a0000000-0000-0000-0000-000000000003';
BEGIN
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, aud, role,
    is_sso_user, is_anonymous
  ) VALUES (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@nexusoms.vn',
    crypt('Admin@123', gen_salt('bf', 10)),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('full_name', 'Nguyen Quan Tri', 'role', 'admin'),
    now(), now(), 'authenticated', 'authenticated',
    false, false
  );

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, aud, role,
    is_sso_user, is_anonymous
  ) VALUES (
    v_mgr_id,
    '00000000-0000-0000-0000-000000000000',
    'manager@nexusoms.vn',
    crypt('Manager@123', gen_salt('bf', 10)),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('full_name', 'Tran Quan Ly', 'role', 'manager'),
    now(), now(), 'authenticated', 'authenticated',
    false, false
  );

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, aud, role,
    is_sso_user, is_anonymous
  ) VALUES (
    v_wh_id,
    '00000000-0000-0000-0000-000000000000',
    'warehouse@nexusoms.vn',
    crypt('Warehouse@123', gen_salt('bf', 10)),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('full_name', 'Le Nhan Kho', 'role', 'warehouse'),
    now(), now(), 'authenticated', 'authenticated',
    false, false
  );

  -- Insert identities for each user (email column is generated, skip it)
  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_admin_id, jsonb_build_object('sub', v_admin_id, 'email', 'admin@nexusoms.vn'), 'email', now(), now()),
    (gen_random_uuid(), v_mgr_id,  jsonb_build_object('sub', v_mgr_id,  'email', 'manager@nexusoms.vn'), 'email', now(), now()),
    (gen_random_uuid(), v_wh_id,   jsonb_build_object('sub', v_wh_id,   'email', 'warehouse@nexusoms.vn'), 'email', now(), now());

  -- Insert/ensure profiles
  INSERT INTO profiles (id, email, full_name, role, is_active)
  VALUES
    (v_admin_id, 'admin@nexusoms.vn', 'Nguyen Quan Tri', 'admin', true),
    (v_mgr_id, 'manager@nexusoms.vn', 'Tran Quan Ly', 'manager', true),
    (v_wh_id, 'warehouse@nexusoms.vn', 'Le Nhan Kho', 'warehouse', true)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name;
END $$;
