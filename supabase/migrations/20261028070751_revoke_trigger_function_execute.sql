-- Revoke EXECUTE on trigger function from anon and authenticated
-- This is a trigger function, should only be called by the database, not via RPC
REVOKE EXECUTE ON FUNCTION public.validate_bundle_component_tenant() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_bundle_component_tenant() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_bundle_component_tenant() FROM authenticated;
