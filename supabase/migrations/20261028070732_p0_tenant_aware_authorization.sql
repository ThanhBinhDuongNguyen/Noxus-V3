/*
# P0-1 + P0-2: Tenant-Aware Authorization for Admin Functions

## P0-1 Fixes
1. admin_create_user — use tenant_memberships.role (not profiles.role) for authorization
   - Caller must be admin/owner of a tenant
   - New user assigned to caller's tenant (not first tenant)
2. admin_update_profile — verify target user is in same tenant as caller
   - Prevents cross-tenant profile modification
3. tenants INSERT — restrict to authenticated (remove with_check: true)
   - New tenant creation should be a deliberate action, not open

## P0-2 Fixes
4. bundle_components — remove hardcoded DEFAULT tenant_id
   - Column stays nullable, application must set it
   - Existing data (if any) retains its value
5. Add cross-tenant check constraint on bundle_components via trigger
*/

-- ==========================================
-- P0-1: Fix admin_create_user
-- ==========================================
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text DEFAULT 'warehouse'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_tenant_id uuid;
  v_caller_tenant_role text;
  v_new_user_id uuid;
BEGIN
  -- Authorization: caller must have admin/owner role in a tenant
  SELECT m.tenant_id, m.role
    INTO v_caller_tenant_id, v_caller_tenant_role
    FROM public.tenant_memberships m
    WHERE m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role IN ('admin', 'owner')
    ORDER BY m.created_at
    LIMIT 1;

  IF v_caller_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Khong co quyen: chi admin/owner cua tenant moi duoc tao nguoi dung' USING ERRCODE = '42501';
  END IF;

  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud,
    role
  )
  VALUES (
    (SELECT id FROM auth.instances LIMIT 1),
    lower(p_email),
    crypt(p_password, gen_salt('bf', 10)),
    now(),
    jsonb_build_object('role', 'authenticated', 'provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    now(),
    now(),
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO v_new_user_id;

  INSERT INTO auth.identities (
    user_id, identity_data, provider, created_at, updated_at
  )
  VALUES (
    v_new_user_id,
    jsonb_build_object('sub', v_new_user_id::text, 'email', lower(p_email)),
    'email', now(), now()
  );

  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (v_new_user_id, lower(p_email), p_full_name, p_role, true)
  ON CONFLICT (id) DO NOTHING;

  -- Assign new user to CALLER's tenant (not first tenant)
  INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
  VALUES (
    v_caller_tenant_id,
    v_new_user_id,
    CASE WHEN p_role = 'admin' THEN 'admin' ELSE 'warehouse' END,
    'active'
  )
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  RETURN v_new_user_id;
END;
$$;

-- ==========================================
-- P0-1: Fix admin_update_profile
-- ==========================================
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_user_id uuid,
  p_role text,
  p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_tenant_id uuid;
  v_caller_tenant_role text;
  v_target_tenant_id uuid;
BEGIN
  -- Authorization: caller must be admin/owner of a tenant
  SELECT m.tenant_id, m.role
    INTO v_caller_tenant_id, v_caller_tenant_role
    FROM public.tenant_memberships m
    WHERE m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role IN ('admin', 'owner')
    ORDER BY m.created_at
    LIMIT 1;

  IF v_caller_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Khong co quyen: chi admin/owner moi duoc cap nhat nguoi dung' USING ERRCODE = '42501';
  END IF;

  -- Cross-tenant check: target user must be in the SAME tenant as caller
  SELECT m.tenant_id INTO v_target_tenant_id
    FROM public.tenant_memberships m
    WHERE m.user_id = p_user_id
      AND m.tenant_id = v_caller_tenant_id
      AND m.status = 'active'
    LIMIT 1;

  IF v_target_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Khong co quyen: nguoi dung khong thuoc tenant cua ban' USING ERRCODE = '42501';
  END IF;

  -- Update profile
  UPDATE public.profiles
  SET role = p_role,
      is_active = p_is_active,
      updated_at = now()
  WHERE id = p_user_id;

  -- Sync auth metadata
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}', to_jsonb('authenticated'::text)
  ),
  updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- ==========================================
-- P0-1: Fix tenants INSERT policy (was with_check: true)
-- ==========================================
DROP POLICY IF EXISTS tenants_insert_authenticated ON public.tenants;

-- Only allow tenant creation via service_role (edge functions), not from browser
-- Authenticated users cannot create tenants directly
CREATE POLICY "tenants_insert_service_only" ON public.tenants FOR INSERT
  TO authenticated WITH CHECK (false);

-- ==========================================
-- P0-2: Remove hardcoded DEFAULT from bundle_components.tenant_id
-- ==========================================
ALTER TABLE public.bundle_components
  ALTER COLUMN tenant_id DROP DEFAULT;

-- ==========================================
-- P0-2: Add trigger to enforce cross-tenant integrity on bundle_components
-- bundle_id and product_id must reference records in the SAME tenant
-- ==========================================
CREATE OR REPLACE FUNCTION public.validate_bundle_component_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bundle_tenant_id uuid;
  v_product_tenant_id uuid;
BEGIN
  -- Get tenant_id of the bundle
  SELECT b.tenant_id INTO v_bundle_tenant_id
    FROM public.bundles b
    WHERE b.id = NEW.bundle_id;

  IF v_bundle_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Bundle khong ton tai hoac khong co tenant_id' USING ERRCODE = '23503';
  END IF;

  -- Bundle component's tenant_id must match bundle's tenant_id
  IF NEW.tenant_id IS DISTINCT FROM v_bundle_tenant_id THEN
    RAISE EXCEPTION 'Tenant id khong khop: bundle_component thuoc tenant khac voi bundle' USING ERRCODE = '42501';
  END IF;

  -- Product must be in the same tenant
  SELECT p.tenant_id INTO v_product_tenant_id
    FROM public.products p
    WHERE p.id = NEW.product_id;

  IF v_product_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Product khong ton tai hoac khong co tenant_id' USING ERRCODE = '23503';
  END IF;

  IF v_product_tenant_id IS DISTINCT FROM v_bundle_tenant_id THEN
    RAISE EXCEPTION 'Tenant id khong khop: product thuoc tenant khac voi bundle' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bundle_component_tenant_check ON public.bundle_components;
CREATE TRIGGER trg_bundle_component_tenant_check
  BEFORE INSERT OR UPDATE ON public.bundle_components
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_bundle_component_tenant();

GRANT EXECUTE ON FUNCTION public.validate_bundle_component_tenant() TO authenticated;
