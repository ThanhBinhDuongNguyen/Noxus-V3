/*
# Fix: Add missing instance row in auth.instances

## Root cause
The demo users were created with instance_id = '00000000-0000-0000-0000-000000000000'
but no corresponding row exists in auth.instances. GoTrue queries the instance
during login and fails with "Database error querying schema" when it's missing.
*/

INSERT INTO auth.instances (id, uuid, raw_base_config, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  '',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
