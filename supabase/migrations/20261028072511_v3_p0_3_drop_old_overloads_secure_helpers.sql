/*
# P0-3: Drop old function overloads + secure helper functions

## Problem
The V3 migration created new function signatures with p_tenant_id, but the OLD
signatures (without p_tenant_id) still exist as overloads. The Supabase linter
reports all of them as callable by authenticated. The old overloads are dangerous
because they fall back to ORDER BY created_at LIMIT 1.

## Fix
1. DROP the old overloads (without p_tenant_id) for all functions.
2. REVOKE EXECUTE on helper functions (assert_tenant_membership, get_user_tenant_ids,
   is_tenant_admin, validate_bundle_component_tenant) — these should never be
   called directly via RPC.
3. The remaining SECURITY DEFINER functions (dashboard, stock, audit, admin) are
   intentionally callable by authenticated — they validate membership internally.
*/

-- Drop old overloads (signatures without p_tenant_id)
DROP FUNCTION IF EXISTS public.get_dashboard_metrics();
DROP FUNCTION IF EXISTS public.get_dashboard_daily();
DROP FUNCTION IF EXISTS public.get_low_stock_products();
DROP FUNCTION IF EXISTS public.decrement_stock(uuid, integer);
DROP FUNCTION IF EXISTS public.restore_stock(uuid, integer);
DROP FUNCTION IF EXISTS public.append_audit_log(text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.verify_audit_chain();
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, text);
DROP FUNCTION IF EXISTS public.admin_update_profile(uuid, text, boolean);

-- Revoke EXECUTE on helper functions — these are internal, not for RPC
REVOKE EXECUTE ON FUNCTION public.assert_tenant_membership(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_ids() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_tenant_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_bundle_component_tenant() FROM PUBLIC, anon, authenticated;
