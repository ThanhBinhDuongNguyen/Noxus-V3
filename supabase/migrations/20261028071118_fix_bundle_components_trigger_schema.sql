-- FIX: bundle_components trigger referenced non-existent bundle_id column and bundles table
-- Actual schema: parent_bundle_product_id → products(id), child_product_id → products(id)
-- Bundles are products with sku_type='virtual_bundle'

DROP TRIGGER IF EXISTS trg_bundle_component_tenant_check ON public.bundle_components;
DROP FUNCTION IF EXISTS public.validate_bundle_component_tenant();

CREATE OR REPLACE FUNCTION public.validate_bundle_component_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_parent_tenant_id uuid;
  v_child_tenant_id uuid;
BEGIN
  -- Get tenant_id of the parent bundle product
  SELECT p.tenant_id INTO v_parent_tenant_id
    FROM public.products p
    WHERE p.id = NEW.parent_bundle_product_id;

  IF v_parent_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Parent bundle product khong ton tai hoac khong co tenant_id' USING ERRCODE = '23503';
  END IF;

  -- bundle_components.tenant_id must match parent bundle product's tenant_id
  IF NEW.tenant_id IS DISTINCT FROM v_parent_tenant_id THEN
    RAISE EXCEPTION 'Tenant id khong khop: bundle_component thuoc tenant khac voi parent bundle' USING ERRCODE = '42501';
  END IF;

  -- Child product must be in the SAME tenant as parent bundle
  SELECT p.tenant_id INTO v_child_tenant_id
    FROM public.products p
    WHERE p.id = NEW.child_product_id;

  IF v_child_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Child product khong ton tai hoac khong co tenant_id' USING ERRCODE = '23503';
  END IF;

  IF v_child_tenant_id IS DISTINCT FROM v_parent_tenant_id THEN
    RAISE EXCEPTION 'Tenant id khong khop: child product thuoc tenant khac voi parent bundle' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bundle_component_tenant_check
  BEFORE INSERT OR UPDATE ON public.bundle_components
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_bundle_component_tenant();

-- Trigger function should not be callable via RPC
REVOKE EXECUTE ON FUNCTION public.validate_bundle_component_tenant() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_bundle_component_tenant() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_bundle_component_tenant() FROM authenticated;
