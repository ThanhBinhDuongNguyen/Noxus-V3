/*
# Seed demo accounts: manager and warehouse

## Purpose
Create two additional demo accounts so the RBAC system can be demonstrated:
- manager@nexusoms.vn (role: manager) — password: Manager@123
- warehouse@nexusoms.vn (role: warehouse) — password: Warehouse@123

## Method
Inserts directly into auth.users with explicit UUID and encrypted passwords.
The on_auth_user_created trigger creates the profiles row.
We then update profiles to set the correct role and full_name.

Idempotent: checks if email already exists before inserting.
*/

DO $$
DECLARE
  mgr_id uuid := gen_random_uuid();
  wh_id uuid := gen_random_uuid();
BEGIN
  -- Create manager account if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'manager@nexusoms.vn') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, created_at, updated_at, aud, role
    ) VALUES (
      mgr_id,
      '00000000-0000-0000-0000-000000000000',
      'manager@nexusoms.vn',
      crypt('Manager@123', gen_salt('bf')),
      now(),
      jsonb_build_object('full_name', 'Tran Quan Ly', 'role', 'manager'),
      now(), now(), 'authenticated', 'authenticated'
    );

    UPDATE profiles SET role = 'manager', full_name = 'Tran Quan Ly'
    WHERE id = mgr_id;
  END IF;

  -- Create warehouse account if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'warehouse@nexusoms.vn') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, created_at, updated_at, aud, role
    ) VALUES (
      wh_id,
      '00000000-0000-0000-0000-000000000000',
      'warehouse@nexusoms.vn',
      crypt('Warehouse@123', gen_salt('bf')),
      now(),
      jsonb_build_object('full_name', 'Le Nhan Kho', 'role', 'warehouse'),
      now(), now(), 'authenticated', 'authenticated'
    );

    UPDATE profiles SET role = 'warehouse', full_name = 'Le Nhan Kho'
    WHERE id = wh_id;
  END IF;
END $$;
