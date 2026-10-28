/*
# Fix Critical Security Issues Found in Post-Implementation Audit

## Summary
Fixes three P0/P1 security findings from the audit:
1. bundle_components table has no tenant_id and uses USING(true) policies — any user can access all bundle data.
2. Four tenant foundation tables (tenants, tenant_memberships, tenant_invitations, tenant_settings) grant full CRUD to the anon role.
3. admin_create_user and admin_update_profile SECURITY DEFINER functions are callable by any authenticated user, not just admins.

## Changes

### 1. bundle_components — add tenant_id + fix policies
- Added tenant_id column (nullable with default to current default tenant, matching existing pattern).
- Dropped the open USING(true) anon policies.
- Added proper tenant-scoped CRUD policies (same pattern as all other business tables).
- Granted CRUD to authenticated only (removed anon grant).

### 2. Tenant foundation tables — remove anon grants
- REVOKE all privileges FROM anon on: tenants, tenant_memberships, tenant_invitations, tenant_settings.
- These tables require authentication; anon should never touch tenant management.

### 3. admin_create_user / admin_update_profile — restrict to admin role
- REVOKE EXECUTE FROM authenticated (keeps the earlier revoke from PUBLIC/anon).
- These functions are SECURITY DEFINER and must only be callable by users with admin role.
- Granted EXECUTE only to service_role (edge functions / server-side admin operations).

## Security
- RLS policies on bundle_components now enforce tenant membership checks.
- anon role can no longer read/write tenant management tables.
- admin_create_user and admin_update_profile can no longer be called by any authenticated user via the REST API.
*/

-- 1. Fix bundle_components: add tenant_id and replace open policies
ALTER TABLE public.bundle_components
  ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT '33b2bf49-18b9-4041-bbb0-9deb11e1fc7e'::uuid;

-- Update existing rows to default tenant
UPDATE public.bundle_components SET tenant_id = '33b2bf49-18b9-4041-bbb0-9deb11e1fc7e'::uuid WHERE tenant_id IS NULL;

-- Create index for tenant scoping
CREATE INDEX IF NOT EXISTS idx_bundle_components_tenant_id ON public.bundle_components(tenant_id);

-- Drop the open anon policies
DROP POLICY IF EXISTS "anon_select_bundle_components" ON public.bundle_components;
DROP POLICY IF EXISTS "anon_insert_bundle_components" ON public.bundle_components;
DROP POLICY IF EXISTS "anon_update_bundle_components" ON public.bundle_components;
DROP POLICY IF EXISTS "anon_delete_bundle_components" ON public.bundle_components;

-- Remove anon grant, keep authenticated only
REVOKE ALL ON public.bundle_components FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bundle_components TO authenticated;

-- Create proper tenant-scoped policies
CREATE POLICY "tenant_select_bundle_components" ON public.bundle_components
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tenant_memberships m
    WHERE m.tenant_id = bundle_components.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'));

CREATE POLICY "tenant_insert_bundle_components" ON public.bundle_components
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM tenant_memberships m
    WHERE m.tenant_id = bundle_components.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'));

CREATE POLICY "tenant_update_bundle_components" ON public.bundle_components
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM tenant_memberships m
    WHERE m.tenant_id = bundle_components.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'))
  WITH CHECK (EXISTS (SELECT 1 FROM tenant_memberships m
    WHERE m.tenant_id = bundle_components.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'));

CREATE POLICY "tenant_delete_bundle_components" ON public.bundle_components
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM tenant_memberships m
    WHERE m.tenant_id = bundle_components.tenant_id AND m.user_id = auth.uid() AND m.status = 'active'));

-- 2. Remove anon grants from tenant foundation tables
REVOKE ALL ON public.tenants FROM anon;
REVOKE ALL ON public.tenant_memberships FROM anon;
REVOKE ALL ON public.tenant_invitations FROM anon;
REVOKE ALL ON public.tenant_settings FROM anon;

-- 3. Restrict admin_create_user and admin_update_profile to service_role only
-- These are SECURITY DEFINER functions that create/modify users — must not be callable by any authenticated user
REVOKE EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, boolean) FROM authenticated;

-- Grant to service_role for server-side admin operations
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, boolean) TO service_role;
