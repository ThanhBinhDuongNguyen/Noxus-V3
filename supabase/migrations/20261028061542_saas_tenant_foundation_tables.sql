/*
# Multi-Tenant Foundation: Tables (no policies yet)

Creates the 4 core tenant tables and backfills existing users.
Policies will be added in the next migration after all tables exist.
*/

-- 1. tenants
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. tenant_memberships
CREATE TABLE IF NOT EXISTS tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'warehouse' CHECK (role IN ('owner', 'admin', 'manager', 'warehouse', 'finance', 'viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- 3. tenant_invitations
CREATE TABLE IF NOT EXISTS tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'warehouse' CHECK (role IN ('owner', 'admin', 'manager', 'warehouse', 'finance', 'viewer')),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);

-- 4. tenant_settings
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  currency text NOT NULL DEFAULT 'VND',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE ON tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tenant_settings TO authenticated;

-- Backfill: default tenant + memberships for existing profiles
DO $$
DECLARE
  v_tenant_id uuid;
  v_profile record;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'default';
  IF v_tenant_id IS NULL THEN
    INSERT INTO tenants (slug, name, status)
    VALUES ('default', 'NexusOMS Default', 'active')
    RETURNING id INTO v_tenant_id;
  END IF;

  INSERT INTO tenant_settings (tenant_id, timezone, currency)
  VALUES (v_tenant_id, 'Asia/Ho_Chi_Minh', 'VND')
  ON CONFLICT (tenant_id) DO NOTHING;

  FOR v_profile IN SELECT id FROM profiles LOOP
    INSERT INTO tenant_memberships (tenant_id, user_id, role, status)
    VALUES (v_tenant_id, v_profile.id, 'owner', 'active')
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  END LOOP;
END $$;
