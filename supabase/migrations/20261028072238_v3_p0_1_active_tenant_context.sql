/*
# P0-1: Active Tenant Context — Explicit p_tenant_id on all RPCs

## Problem
All 6 SECURITY DEFINER RPCs used `ORDER BY created_at LIMIT 1` to infer the caller's
tenant. If a user belongs to multiple tenants, the RPC silently picks the oldest
membership — ignoring the workspace the user selected in the UI.

## Fix
1. Add p_tenant_id parameter to every RPC.
2. Validate membership via assert_tenant_membership helper.
3. Remove ORDER BY created_at LIMIT 1 tenant inference.
4. Fix verify_audit_chain to be tenant-scoped.
5. Use extensions.digest() explicitly (pgcrypto is in extensions schema, not public).
6. admin_create_user/admin_update_profile accept explicit p_tenant_id with fallback.
*/

-- Helper: assert_tenant_membership
CREATE OR REPLACE FUNCTION public.assert_tenant_membership(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
    FROM public.tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND status = 'active';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Khong co quyen: ban khong thuoc tenant nay' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assert_tenant_membership(uuid) FROM PUBLIC, anon;

-- get_dashboard_metrics(p_tenant_id)
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_revenue numeric;
  v_prev_revenue numeric;
  v_total_orders bigint;
  v_recent_orders_count bigint;
  v_pending_orders bigint;
  v_active_customers bigint;
  v_total_customers bigint;
  v_total_products bigint;
  v_low_stock_count bigint;
  v_revenue_7d numeric;
  v_status_counts jsonb;
BEGIN
  PERFORM public.assert_tenant_membership(p_tenant_id);

  SELECT COALESCE(SUM(total), 0) INTO v_revenue
    FROM public.orders
    WHERE tenant_id = p_tenant_id
      AND placed_at >= now() - interval '30 days'
      AND status IN ('pending','processing','shipped','delivered');

  SELECT COALESCE(SUM(total), 0) INTO v_prev_revenue
    FROM public.orders
    WHERE tenant_id = p_tenant_id
      AND placed_at >= now() - interval '60 days'
      AND placed_at < now() - interval '30 days'
      AND status IN ('pending','processing','shipped','delivered');

  SELECT count(*) INTO v_total_orders
    FROM public.orders WHERE tenant_id = p_tenant_id;

  SELECT count(*) INTO v_recent_orders_count
    FROM public.orders
    WHERE tenant_id = p_tenant_id
      AND placed_at >= now() - interval '30 days'
      AND status IN ('pending','processing','shipped','delivered');

  SELECT count(*) INTO v_pending_orders
    FROM public.orders
    WHERE tenant_id = p_tenant_id AND status IN ('pending','processing');

  SELECT count(*) INTO v_active_customers
    FROM public.customers WHERE tenant_id = p_tenant_id AND status = 'active';

  SELECT count(*) INTO v_total_customers
    FROM public.customers WHERE tenant_id = p_tenant_id;

  SELECT count(*), count(*) FILTER (WHERE stock <= reorder_level)
    INTO v_total_products, v_low_stock_count
    FROM public.products WHERE tenant_id = p_tenant_id;

  SELECT COALESCE(SUM(total), 0) INTO v_revenue_7d
    FROM public.orders
    WHERE tenant_id = p_tenant_id
      AND placed_at >= now() - interval '7 days'
      AND status != 'cancelled';

  SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb) INTO v_status_counts
    FROM (
      SELECT status, count(*) as cnt
      FROM public.orders WHERE tenant_id = p_tenant_id
      GROUP BY status
    ) s;

  RETURN jsonb_build_object(
    'revenue', v_revenue,
    'prev_revenue', v_prev_revenue,
    'total_orders', v_total_orders,
    'recent_orders_count', v_recent_orders_count,
    'pending_orders', v_pending_orders,
    'active_customers', v_active_customers,
    'total_customers', v_total_customers,
    'total_products', v_total_products,
    'low_stock_count', v_low_stock_count,
    'revenue_7d', v_revenue_7d,
    'status_counts', v_status_counts
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid) TO authenticated;

-- get_dashboard_daily(p_tenant_id)
CREATE OR REPLACE FUNCTION public.get_dashboard_daily(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public.assert_tenant_membership(p_tenant_id);

  SELECT COALESCE(jsonb_agg(row_to_json(d)), '[]'::jsonb) INTO v_result
    FROM (
      SELECT
        date_trunc('day', placed_at)::date as day,
        COALESCE(SUM(total), 0) as revenue,
        count(*) as order_count
      FROM public.orders
      WHERE tenant_id = p_tenant_id
        AND placed_at >= now() - interval '7 days'
        AND status != 'cancelled'
      GROUP BY date_trunc('day', placed_at)
      ORDER BY day
    ) d;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_daily(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_daily(uuid) TO authenticated;

-- get_low_stock_products(p_tenant_id)
CREATE OR REPLACE FUNCTION public.get_low_stock_products(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public.assert_tenant_membership(p_tenant_id);

  SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb) INTO v_result
    FROM (
      SELECT id, name, stock, reorder_level
      FROM public.products
      WHERE tenant_id = p_tenant_id AND stock <= reorder_level
      ORDER BY stock ASC
      LIMIT 10
    ) p;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_low_stock_products(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_low_stock_products(uuid) TO authenticated;

-- decrement_stock(p_product_id, p_qty, p_tenant_id)
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
BEGIN
  PERFORM public.assert_tenant_membership(p_tenant_id);

  SELECT tenant_id INTO v_product_tenant_id
    FROM public.products WHERE id = p_product_id;

  IF v_product_tenant_id IS NULL THEN
    RAISE EXCEPTION 'San pham khong ton tai' USING ERRCODE = '42704';
  END IF;

  IF v_product_tenant_id != p_tenant_id THEN
    RAISE EXCEPTION 'Khong co quyen: san pham khong thuoc tenant nay' USING ERRCODE = '42501';
  END IF;

  UPDATE products
  SET stock = GREATEST(stock - p_qty, 0)
  WHERE id = p_product_id
  RETURNING stock INTO new_stock;

  RETURN new_stock;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, integer, uuid) TO authenticated;

-- restore_stock(p_product_id, p_qty, p_tenant_id)
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
BEGIN
  PERFORM public.assert_tenant_membership(p_tenant_id);

  SELECT tenant_id INTO v_product_tenant_id
    FROM public.products WHERE id = p_product_id;

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

  RETURN new_stock;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restore_stock(uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_stock(uuid, integer, uuid) TO authenticated;

-- append_audit_log(p_actor_id, p_action, p_entity_ref, p_payload, p_tenant_id)
CREATE OR REPLACE FUNCTION public.append_audit_log(
  p_actor_id text,
  p_action text,
  p_entity_ref text,
  p_payload jsonb,
  p_tenant_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_prev_hash text;
  v_new_hash text;
  v_id uuid;
  v_payload_str text;
  v_created_at timestamptz;
BEGIN
  PERFORM public.assert_tenant_membership(p_tenant_id);

  v_created_at := now();

  SELECT current_hash INTO v_prev_hash FROM audit_logs
    WHERE tenant_id = p_tenant_id
    ORDER BY created_at DESC, id DESC LIMIT 1;

  v_payload_str := coalesce(p_payload::text, '{}');
  v_new_hash := encode(
    digest(
      coalesce(v_prev_hash, 'GENESIS') || '|' || v_payload_str || '|' || p_action || '|' || coalesce(p_entity_ref, '') || '|' || v_created_at::text,
      'sha256'
    ),
    'hex'
  );

  INSERT INTO audit_logs (id, actor_id, action, entity_ref, payload_json, prev_hash, current_hash, created_at, tenant_id)
  VALUES (gen_random_uuid(), p_actor_id, p_action, p_entity_ref, p_payload, v_prev_hash, v_new_hash, v_created_at, p_tenant_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.append_audit_log(text, text, text, jsonb, uuid) FROM PUBLIC, anon;

-- verify_audit_chain(p_tenant_id)
CREATE OR REPLACE FUNCTION public.verify_audit_chain(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_prev_hash text;
  v_rec record;
  v_expected text;
  v_broken_id uuid;
  v_expected_hash text;
  v_actual_hash text;
  v_count integer := 0;
BEGIN
  PERFORM public.assert_tenant_membership(p_tenant_id);

  v_prev_hash := null;
  FOR v_rec IN
    SELECT * FROM audit_logs
    WHERE tenant_id = p_tenant_id
    ORDER BY created_at ASC, id ASC
  LOOP
    v_count := v_count + 1;
    v_expected := encode(
      digest(
        coalesce(v_prev_hash, 'GENESIS') || '|' || coalesce(v_rec.payload_json::text, '{}') || '|' || v_rec.action || '|' || coalesce(v_rec.entity_ref, '') || '|' || v_rec.created_at::text,
        'sha256'
      ),
      'hex'
    );
    IF v_rec.current_hash <> v_expected THEN
      v_broken_id := v_rec.id;
      v_expected_hash := v_expected;
      v_actual_hash := v_rec.current_hash;
      EXIT;
    END IF;
    v_prev_hash := v_rec.current_hash;
  END LOOP;

  IF v_broken_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'total_entries', v_count,
      'broken_at_id', v_broken_id,
      'expected_hash', v_expected_hash,
      'actual_hash', v_actual_hash
    );
  ELSE
    RETURN jsonb_build_object(
      'is_valid', true,
      'total_entries', v_count
    );
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_audit_chain(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_audit_chain(uuid) TO authenticated;

-- admin_create_user(... p_tenant_id)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text DEFAULT 'warehouse',
  p_tenant_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_user_id uuid;
  v_caller_role text;
BEGIN
  IF p_tenant_id IS NOT NULL THEN
    SELECT role INTO v_caller_role
      FROM public.tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = p_tenant_id
        AND status = 'active'
        AND role IN ('admin', 'owner')
      LIMIT 1;
    IF v_caller_role IS NULL THEN
      RAISE EXCEPTION 'Khong co quyen: ban khong phai admin cua tenant nay' USING ERRCODE = '42501';
    END IF;
  ELSE
    SELECT m.tenant_id, m.role INTO p_tenant_id, v_caller_role
      FROM public.tenant_memberships m
      WHERE m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('admin', 'owner')
      ORDER BY m.created_at
      LIMIT 1;
    IF p_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Khong co quyen: chi admin/owner moi duoc tao nguoi dung' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO auth.users (
    instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  )
  VALUES (
    (SELECT id FROM auth.instances LIMIT 1),
    lower(p_email),
    crypt(p_password, gen_salt('bf', 10)),
    now(),
    jsonb_build_object('role', 'authenticated', 'provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    now(), now(), 'authenticated', 'authenticated'
  )
  RETURNING id INTO v_new_user_id;

  INSERT INTO auth.identities (user_id, identity_data, provider, created_at, updated_at)
  VALUES (v_new_user_id, jsonb_build_object('sub', v_new_user_id::text, 'email', lower(p_email)), 'email', now(), now());

  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (v_new_user_id, lower(p_email), p_full_name, p_role, true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
  VALUES (p_tenant_id, v_new_user_id, CASE WHEN p_role = 'admin' THEN 'admin' ELSE 'warehouse' END, 'active')
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  RETURN v_new_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, uuid) TO authenticated;

-- admin_update_profile(... p_tenant_id)
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_user_id uuid,
  p_role text,
  p_is_active boolean,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text;
  v_target_tenant_id uuid;
BEGIN
  IF p_tenant_id IS NOT NULL THEN
    SELECT role INTO v_caller_role
      FROM public.tenant_memberships
      WHERE user_id = auth.uid()
        AND tenant_id = p_tenant_id
        AND status = 'active'
        AND role IN ('admin', 'owner')
      LIMIT 1;
    IF v_caller_role IS NULL THEN
      RAISE EXCEPTION 'Khong co quyen: ban khong phai admin cua tenant nay' USING ERRCODE = '42501';
    END IF;
    SELECT tenant_id INTO v_target_tenant_id
      FROM public.tenant_memberships
      WHERE user_id = p_user_id AND tenant_id = p_tenant_id AND status = 'active'
      LIMIT 1;
    IF v_target_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Khong co quyen: nguoi dung khong thuoc tenant nay' USING ERRCODE = '42501';
    END IF;
  ELSE
    SELECT m.tenant_id INTO v_target_tenant_id
      FROM public.tenant_memberships m
      WHERE m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('admin', 'owner')
      ORDER BY m.created_at LIMIT 1;
    IF v_target_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Khong co quyen: chi admin/owner moi duoc cap nhat nguoi dung' USING ERRCODE = '42501';
    END IF;
    SELECT tenant_id INTO v_target_tenant_id
      FROM public.tenant_memberships
      WHERE user_id = p_user_id AND tenant_id = v_target_tenant_id AND status = 'active'
      LIMIT 1;
    IF v_target_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Khong co quyen: nguoi dung khong thuoc tenant cua ban' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.profiles
  SET role = p_role, is_active = p_is_active, updated_at = now()
  WHERE id = p_user_id;

  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}', to_jsonb('authenticated'::text)
  ), updated_at = now()
  WHERE id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, boolean, uuid) TO authenticated;
