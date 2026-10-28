-- P0-4 FIX: RLS infinite recursion on profiles + tenant_memberships
--
-- Root cause: profiles_select_shared_tenant JOINs tenant_memberships m1 × m2.
--   tenant_memberships_select has a subquery: EXISTS(SELECT 1 FROM tenant_memberships m2 ...)
--   → querying profiles triggers tenant_memberships SELECT → which queries tenant_memberships again → infinite recursion.
--
-- Fix: Split tenant_memberships SELECT into two policies:
--   1. memberships_select_own: user can always SELECT their own memberships (no subquery)
--   2. memberships_select_by_admin: admin can SELECT all memberships in their tenant
--      BUT use a SECURITY DEFINER helper function to break the recursion, since
--      SECURITY DEFINER functions run with owner privileges and bypass RLS.
--
-- Also simplify profiles_select_shared_tenant to use a helper function.

-- Helper: get the caller's tenant_id(s) as an array — SECURITY DEFINER, bypasses RLS
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_ids uuid[];
BEGIN
  SELECT array_agg(tenant_id) INTO v_tenant_ids
    FROM public.tenant_memberships
    WHERE user_id = auth.uid()
      AND status = 'active';
  RETURN COALESCE(v_tenant_ids, ARRAY[]::uuid[]);
END;
$$;

-- Helper: check if caller is admin of a specific tenant — SECURITY DEFINER, bypasses RLS
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
    FROM public.tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND status = 'active'
      AND role IN ('admin', 'owner')
    LIMIT 1;
  RETURN v_role IS NOT NULL;
END;
$$;

-- Revoke EXECUTE from anon/PUBLIC on helper functions
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_tenant_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_tenant_admin(uuid) FROM anon;

-- Fix profiles SELECT policy: use helper function instead of joining tenant_memberships
DROP POLICY IF EXISTS profiles_select_shared_tenant ON public.profiles;
CREATE POLICY "profiles_select_shared_tenant" ON public.profiles FOR SELECT
  TO authenticated
  USING (
    -- User can see their own profile
    id = auth.uid()
    -- OR user can see profiles of users in the same tenant
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.tenant_id = ANY(public.get_user_tenant_ids())
        AND m.user_id = profiles.id
        AND m.status = 'active'
    )
  );

-- Fix tenant_memberships SELECT policies: replace self-referencing admin check with helper
DROP POLICY IF EXISTS memberships_select ON public.tenant_memberships;

CREATE POLICY "memberships_select_own" ON public.tenant_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "memberships_select_by_admin" ON public.tenant_memberships FOR SELECT
  TO authenticated
  USING (public.is_tenant_admin(tenant_memberships.tenant_id));
