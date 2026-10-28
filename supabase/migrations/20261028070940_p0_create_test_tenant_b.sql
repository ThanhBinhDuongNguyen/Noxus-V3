-- P0-3: Create test tenant B + test user B + test data for cross-tenant tests
-- Test data only, cleaned up after tests.

-- Create tenant B
INSERT INTO public.tenants (id, name, slug, status)
VALUES (
  'cccc0000-0000-0000-0000-000000000002',
  'Tenant B Test', 'tenant-b-test', 'active'
)
ON CONFLICT (id) DO NOTHING;

-- Create test user B (auth user) — with explicit UUID
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'adminB@test-tenant.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
    )
    VALUES (
      'dddd0000-0000-0000-0000-000000000003',
      (SELECT id FROM auth.instances LIMIT 1),
      'adminB@test-tenant.com',
      crypt('TestB@123', gen_salt('bf', 10)),
      now(),
      jsonb_build_object('role', 'authenticated', 'provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('full_name', 'Admin B Test', 'role', 'admin'),
      now(), now(), 'authenticated', 'authenticated'
    );
  END IF;
END $$;

-- Create identity for test user B — email is a generated column, don't insert it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = 'dddd0000-0000-0000-0000-000000000003'
  ) THEN
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (
      'dddd0000-0000-0000-0000-000000000003',
      'dddd0000-0000-0000-0000-000000000003',
      jsonb_build_object('sub', 'dddd0000-0000-0000-0000-000000000003', 'email', 'adminB@test-tenant.com'),
      'email',
      now(), now()
    );
  END IF;
END $$;

-- Create profile for test user B
INSERT INTO public.profiles (id, email, full_name, role, is_active)
VALUES (
  'dddd0000-0000-0000-0000-000000000003',
  'adminB@test-tenant.com', 'Admin B Test', 'admin', true
)
ON CONFLICT (id) DO NOTHING;

-- Create membership: admin B → tenant B (as admin)
INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
VALUES (
  'cccc0000-0000-0000-0000-000000000002',
  'dddd0000-0000-0000-0000-000000000003',
  'admin', 'active'
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Create a product in tenant A (default tenant)
INSERT INTO public.products (id, tenant_id, name, sku, price, cost, stock, reorder_level, safety_stock, status, sku_type)
SELECT
  'aaaa0000-0000-0000-0000-000000000001',
  '33b2bf49-18b9-4041-bbb0-9deb11e1fc7e',
  'Product A Test', 'PROD-A-TEST', 100000, 80000, 50, 10, 5, 'active', 'physical'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE id = 'aaaa0000-0000-0000-0000-000000000001');

-- Create a product in tenant B
INSERT INTO public.products (id, tenant_id, name, sku, price, cost, stock, reorder_level, safety_stock, status, sku_type)
SELECT
  'bbbb0000-0000-0000-0000-000000000002',
  'cccc0000-0000-0000-0000-000000000002',
  'Product B Test', 'PROD-B-TEST', 200000, 150000, 30, 5, 3, 'active', 'physical'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE id = 'bbbb0000-0000-0000-0000-000000000002');
