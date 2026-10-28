/*
# P0-2: Stock Authorization & Atomicity

## Fix
1. Drop hardcoded DEFAULT from stock_transactions.tenant_id.
2. Rewrite decrement_stock / restore_stock with:
   - Role-based authorization (warehouse/manager/admin/owner only)
   - SELECT FOR UPDATE row lock for atomicity
   - Inventory ledger entry (stock_transactions)
   - Exception on insufficient stock (no silent clamp to 0)
*/

ALTER TABLE public.stock_transactions ALTER COLUMN tenant_id DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_product_id uuid,
  p_qty integer,
  p_tenant_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_stock integer;
  v_product_tenant_id uuid;
  v_role text;
BEGIN
  SELECT m.role INTO v_role
    FROM public.tenant_memberships m
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = p_tenant_id
      AND m.status = 'active'
      AND m.role IN ('warehouse', 'manager', 'admin', 'owner')
    LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Khong co quyen: ban khong co quyen sua ton kho' USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id INTO v_product_tenant_id
    FROM public.products WHERE id = p_product_id
    FOR UPDATE;

  IF v_product_tenant_id IS NULL THEN
    RAISE EXCEPTION 'San pham khong ton tai' USING ERRCODE = '42704';
  END IF;

  IF v_product_tenant_id != p_tenant_id THEN
    RAISE EXCEPTION 'Khong co quyen: san pham khong thuoc tenant nay' USING ERRCODE = '42501';
  END IF;

  UPDATE products
  SET stock = stock - p_qty
  WHERE id = p_product_id AND stock >= p_qty
  RETURNING stock INTO new_stock;

  IF new_stock IS NULL THEN
    RAISE EXCEPTION 'Ton kho khong du' USING ERRCODE = '23514';
  END IF;

  INSERT INTO stock_transactions (
    warehouse_id, product_id, type, quantity_delta, balance_after,
    reason, created_by, tenant_id
  )
  VALUES (
    (SELECT id FROM public.warehouses WHERE tenant_id = p_tenant_id ORDER BY priority LIMIT 1),
    p_product_id, 'outbound', -p_qty, new_stock,
    'order_decrement', auth.uid()::text, p_tenant_id
  );

  RETURN new_stock;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, integer, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_stock(
  p_product_id uuid,
  p_qty integer,
  p_tenant_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_stock integer;
  v_product_tenant_id uuid;
  v_role text;
BEGIN
  SELECT m.role INTO v_role
    FROM public.tenant_memberships m
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = p_tenant_id
      AND m.status = 'active'
      AND m.role IN ('warehouse', 'manager', 'admin', 'owner')
    LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Khong co quyen: ban khong co quyen sua ton kho' USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id INTO v_product_tenant_id
    FROM public.products WHERE id = p_product_id
    FOR UPDATE;

  IF v_product_tenant_id IS NULL THEN
    RAISE EXCEPTION 'San pham khong ton tai' USING ERRCODE = '42704';
  END IF;

  IF v_product_tenant_id != p_tenant_id THEN
    RAISE EXCEPTION 'Khong co quyen: san pham khong thuoc tenant nay' USING ERRCODE = '42501';
  END IF;

  UPDATE products
  SET stock = stock + p_qty
  WHERE id = p_product_id
  RETURNING stock INTO new_stock;

  INSERT INTO stock_transactions (
    warehouse_id, product_id, type, quantity_delta, balance_after,
    reason, created_by, tenant_id
  )
  VALUES (
    (SELECT id FROM public.warehouses WHERE tenant_id = p_tenant_id ORDER BY priority LIMIT 1),
    p_product_id, 'inbound', p_qty, new_stock,
    'order_restore', auth.uid()::text, p_tenant_id
  );

  RETURN new_stock;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restore_stock(uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_stock(uuid, integer, uuid) TO authenticated;
