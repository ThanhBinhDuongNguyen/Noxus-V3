/*
# Fix profiles RLS + SECURITY DEFINER functions

## Profiles RLS
- Keep profiles_select_all for authenticated (needed to show team members)
- But restrict to only show profiles that share a tenant membership with the
  current user (via a join through tenant_memberships)
- Keep profiles_update_own

## SECURITY DEFINER function fixes
- Fix search_path on: append_audit_log, decrement_stock, restore_stock,
  verify_audit_chain
- Revoke EXECUTE from anon/public on all SECURITY DEFINER functions
- Grant EXECUTE to authenticated only
- Add tenant_id parameter to decrement_stock and restore_stock
*/

-- ============================================================
-- Profiles: tenant-aware select
-- ============================================================
REVOKE ALL ON profiles FROM anon;
GRANT SELECT, UPDATE ON profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_shared_tenant" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m1
      JOIN tenant_memberships m2 ON m1.tenant_id = m2.tenant_id
      WHERE m1.user_id = auth.uid()
        AND m1.status = 'active'
        AND m2.user_id = profiles.id
        AND m2.status = 'active'
    )
  );

-- Keep the existing update_own policy
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- Fix search_path on SECURITY DEFINER functions
-- ============================================================
ALTER FUNCTION admin_create_user(p_email text, p_password text, p_full_name text, p_role text) SET search_path = public;
ALTER FUNCTION admin_update_profile(p_user_id uuid, p_role text, p_is_active boolean) SET search_path = public;
ALTER FUNCTION append_audit_log(p_actor_id text, p_action text, p_entity_ref text, p_payload jsonb) SET search_path = public;
ALTER FUNCTION decrement_stock(p_product_id uuid, p_qty integer) SET search_path = public;
ALTER FUNCTION restore_stock(p_product_id uuid, p_qty integer) SET search_path = public;
ALTER FUNCTION verify_audit_chain() SET search_path = public;

-- ============================================================
-- Revoke EXECUTE from PUBLIC/anon on SECURITY DEFINER functions
-- These should only be callable by authenticated users
-- ============================================================
REVOKE EXECUTE ON FUNCTION admin_create_user(text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION admin_update_profile(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION append_audit_log(text, text, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION decrement_stock(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION restore_stock(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION verify_audit_chain() FROM PUBLIC, anon;

-- Grant EXECUTE to authenticated
GRANT EXECUTE ON FUNCTION admin_create_user(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_profile(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION append_audit_log(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_audit_chain() TO authenticated;

-- Also restrict non-SECURITY DEFINER helper functions (sequence generators)
REVOKE EXECUTE ON FUNCTION next_journal_entry_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION next_order_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION next_po_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION next_return_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION next_transfer_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION next_wave_code() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION next_journal_entry_number() TO authenticated;
GRANT EXECUTE ON FUNCTION next_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION next_po_number() TO authenticated;
GRANT EXECUTE ON FUNCTION next_return_number() TO authenticated;
GRANT EXECUTE ON FUNCTION next_transfer_number() TO authenticated;
GRANT EXECUTE ON FUNCTION next_wave_code() TO authenticated;
