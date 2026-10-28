/*
# Fix: Reset all demo passwords with bcrypt cost 10

## Problem
The bcrypt hashes from gen_salt('bf') use cost factor 6 by default,
which is below GoTrue's minimum (10). This causes "Database error
querying schema" during login because the hash comparison fails
or is rejected.

## Fix
Re-hash all 3 demo passwords with gen_salt('bf', 10).
*/

UPDATE auth.users
  SET encrypted_password = crypt('Admin@123', gen_salt('bf', 10))
  WHERE email = 'admin@nexusoms.vn';

UPDATE auth.users
  SET encrypted_password = crypt('Manager@123', gen_salt('bf', 10))
  WHERE email = 'manager@nexusoms.vn';

UPDATE auth.users
  SET encrypted_password = crypt('Warehouse@123', gen_salt('bf', 10))
  WHERE email = 'warehouse@nexusoms.vn';
