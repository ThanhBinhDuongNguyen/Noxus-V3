/*
# Fix: Create admin demo account + reset all demo passwords

## Problem
- admin@nexusoms.vn was never created in auth.users — only manager and warehouse
- All 3 demo accounts need correct passwords for login to work

## What this does
1. Creates admin@nexusoms.vn if not exists (password: Admin@123, role: admin)
2. Resets passwords for all 3 demo accounts to the documented values
3. Ensures all 3 have correct profile data
*/

DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- 1. Create admin account if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@nexusoms.vn') THEN
    v_admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, created_at, updated_at, aud, role
    ) VALUES (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@nexusoms.vn',
      crypt('Admin@123', gen_salt('bf')),
      now(),
      jsonb_build_object('full_name', 'Nguyen Quan Tri', 'role', 'admin'),
      now(), now(), 'authenticated', 'authenticated'
    );

    UPDATE profiles SET role = 'admin', full_name = 'Nguyen Quan Tri'
    WHERE id = v_admin_id;
  END IF;

  -- 2. Reset all 3 passwords to documented values
  UPDATE auth.users
    SET encrypted_password = crypt('Admin@123', gen_salt('bf'))
    WHERE email = 'admin@nexusoms.vn';

  UPDATE auth.users
    SET encrypted_password = crypt('Manager@123', gen_salt('bf'))
    WHERE email = 'manager@nexusoms.vn';

  UPDATE auth.users
    SET encrypted_password = crypt('Warehouse@123', gen_salt('bf'))
    WHERE email = 'warehouse@nexusoms.vn';
END $$;
