/*
# Fix: Create tenant memberships for demo users + secure SECURITY DEFINER functions

## Changes
1. Create tenant_memberships for all 3 demo users mapped to their profile role
2. Revoke EXECUTE on dangerous SECURITY DEFINER functions from PUBLIC/anon
3. Grant EXECUTE only to authenticated where appropriate

## Security
- admin_create_user: only admin should call → restrict to authenticated (RLS + app-level checks still needed)
- admin_update_profile: only admin/owner → restrict to authenticated
- decrement_stock/restore_stock: authenticated only (called from order flow)
- append_audit_log: authenticated only
- verify_audit_chain: authenticated only (read-only)
*/

-- 1. Create tenant memberships
INSERT INTO tenant_memberships (tenant_id, user_id, role, status)
SELECT
  t.id,
  u.id,
  CASE u.raw_user_meta_data->>'role'
    WHEN 'admin' THEN 'admin'
    WHEN 'manager' THEN 'manager'
    WHEN 'warehouse' THEN 'warehouse'
    ELSE 'warehouse'
  END,
  'active'
FROM auth.users u
CROSS JOIN tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_memberships tm WHERE tm.user_id = u.id AND tm.tenant_id = t.id
);

-- 2. Secure SECURITY DEFINER functions: revoke from PUBLIC, grant to authenticated only
REVOKE EXECUTE ON FUNCTION admin_create_user(text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION admin_update_profile(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION append_audit_log(text, text, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION decrement_stock(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION restore_stock(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION verify_audit_chain() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION admin_create_user(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_profile(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION append_audit_log(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_audit_chain() TO authenticated;
