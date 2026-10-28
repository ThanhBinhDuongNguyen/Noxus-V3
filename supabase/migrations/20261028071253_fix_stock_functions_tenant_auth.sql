-- P1-2 FIX: Add tenant authorization to decrement_stock and restore_stock
-- These SECURITY DEFINER functions bypass RLS and had NO tenant check
-- Any authenticated user could modify stock of products in other tenants

CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id uuid, p_qty integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_stock integer;
  v_product_tenant_id uuid;
BEGIN
  -- Get the product's tenant_id
  SELECT tenant_id INTO v_product_tenant_id
    FROM public.products WHERE id = p_product_id;

  IF v_product_tenant_id IS NULL THEN
    RAISE EXCEPTION 'San pham khong ton tai' USING ERRCODE = '42704';
  END IF;

  -- Verify caller has membership in the same tenant
  IF NOT public.is_tenant_admin(v_product_tenant_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.tenant_memberships m
       WHERE m.tenant_id = v_product_tenant_id
         AND m.user_id = auth.uid()
         AND m.status = 'active'
     ) THEN
    RAISE EXCEPTION 'Khong co quyen: san pham khong thuoc tenant cua ban' USING ERRCODE = '42501';
  END IF;

  UPDATE products
  SET stock = GREATEST(stock - p_qty, 0)
  WHERE id = p_product_id
  RETURNING stock INTO new_stock;

  RETURN new_stock;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_stock(p_product_id uuid, p_qty integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_stock integer;
  v_product_tenant_id uuid;
BEGIN
  -- Get the product's tenant_id
  SELECT tenant_id INTO v_product_tenant_id
    FROM public.products WHERE id = p_product_id;

  IF v_product_tenant_id IS NULL THEN
    RAISE EXCEPTION 'San pham khong ton tai' USING ERRCODE = '42704';
  END IF;

  -- Verify caller has membership in the same tenant
  IF NOT public.is_tenant_admin(v_product_tenant_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.tenant_memberships m
       WHERE m.tenant_id = v_product_tenant_id
         AND m.user_id = auth.uid()
         AND m.status = 'active'
     ) THEN
    RAISE EXCEPTION 'Khong co quyen: san pham khong thuoc tenant cua ban' USING ERRCODE = '42501';
  END IF;

  UPDATE products
  SET stock = stock + p_qty
  WHERE id = p_product_id
  RETURNING stock INTO new_stock;

  RETURN new_stock;
END;
$$;
