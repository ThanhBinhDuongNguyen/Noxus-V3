/*
# Multi-Tenant Foundation: RLS Policies

Adds membership-scoped RLS policies to the 4 tenant tables created in the
previous migration. All policies check tenant_memberships for authorization.
*/

-- ============================================================
-- tenants
-- ============================================================
DROP POLICY IF EXISTS "tenants_select_by_membership" ON tenants;
CREATE POLICY "tenants_select_by_membership" ON tenants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenants.id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "tenants_insert_authenticated" ON tenants;
CREATE POLICY "tenants_insert_authenticated" ON tenants
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "tenants_update_by_owner" ON tenants;
CREATE POLICY "tenants_update_by_owner" ON tenants
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenants.id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenants.id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- tenant_memberships
-- ============================================================
DROP POLICY IF EXISTS "memberships_select" ON tenant_memberships;
CREATE POLICY "memberships_select" ON tenant_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM tenant_memberships m2
        WHERE m2.tenant_id = tenant_memberships.tenant_id
          AND m2.user_id = auth.uid()
          AND m2.status = 'active'
          AND m2.role IN ('owner', 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "memberships_insert_self" ON tenant_memberships;
CREATE POLICY "memberships_insert_self" ON tenant_memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "memberships_insert_by_admin" ON tenant_memberships;
CREATE POLICY "memberships_insert_by_admin" ON tenant_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships m2
      WHERE m2.tenant_id = tenant_memberships.tenant_id
        AND m2.user_id = auth.uid()
        AND m2.status = 'active'
        AND m2.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "memberships_update_own" ON tenant_memberships;
CREATE POLICY "memberships_update_own" ON tenant_memberships
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "memberships_update_by_admin" ON tenant_memberships;
CREATE POLICY "memberships_update_by_admin" ON tenant_memberships
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m2
      WHERE m2.tenant_id = tenant_memberships.tenant_id
        AND m2.user_id = auth.uid()
        AND m2.status = 'active'
        AND m2.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships m2
      WHERE m2.tenant_id = tenant_memberships.tenant_id
        AND m2.user_id = auth.uid()
        AND m2.status = 'active'
        AND m2.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "memberships_delete_by_admin" ON tenant_memberships;
CREATE POLICY "memberships_delete_by_admin" ON tenant_memberships
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m2
      WHERE m2.tenant_id = tenant_memberships.tenant_id
        AND m2.user_id = auth.uid()
        AND m2.status = 'active'
        AND m2.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "memberships_delete_own" ON tenant_memberships;
CREATE POLICY "memberships_delete_own" ON tenant_memberships
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- tenant_invitations
-- ============================================================
DROP POLICY IF EXISTS "invitations_select_by_admin" ON tenant_invitations;
CREATE POLICY "invitations_select_by_admin" ON tenant_invitations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenant_invitations.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "invitations_insert_by_admin" ON tenant_invitations;
CREATE POLICY "invitations_insert_by_admin" ON tenant_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenant_invitations.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "invitations_update_by_admin" ON tenant_invitations;
CREATE POLICY "invitations_update_by_admin" ON tenant_invitations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenant_invitations.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenant_invitations.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "invitations_delete_by_admin" ON tenant_invitations;
CREATE POLICY "invitations_delete_by_admin" ON tenant_invitations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenant_invitations.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- tenant_settings
-- ============================================================
DROP POLICY IF EXISTS "settings_select_by_membership" ON tenant_settings;
CREATE POLICY "settings_select_by_membership" ON tenant_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenant_settings.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "settings_insert_by_admin" ON tenant_settings;
CREATE POLICY "settings_insert_by_admin" ON tenant_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenant_settings.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "settings_update_by_admin" ON tenant_settings;
CREATE POLICY "settings_update_by_admin" ON tenant_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenant_settings.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_memberships m
      WHERE m.tenant_id = tenant_settings.tenant_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  );
