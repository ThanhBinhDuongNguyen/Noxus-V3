-- P1-1: Dashboard aggregation RPC — server-side SUM/COUNT
-- Returns all dashboard metrics in one call, tenant-scoped via RLS

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
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
  -- Get caller's tenant
  SELECT m.tenant_id INTO v_tenant_id
    FROM public.tenant_memberships m
    WHERE m.user_id = auth.uid() AND m.status = 'active'
    ORDER BY m.created_at LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Khong co quyen' USING ERRCODE = '42501';
  END IF;

  -- Revenue last 30 days
  SELECT COALESCE(SUM(total), 0) INTO v_revenue
    FROM public.orders
    WHERE tenant_id = v_tenant_id
      AND placed_at >= now() - interval '30 days'
      AND status IN ('pending','processing','shipped','delivered');

  -- Revenue previous 30 days
  SELECT COALESCE(SUM(total), 0) INTO v_prev_revenue
    FROM public.orders
    WHERE tenant_id = v_tenant_id
      AND placed_at >= now() - interval '60 days'
      AND placed_at < now() - interval '30 days'
      AND status IN ('pending','processing','shipped','delivered');

  -- Total orders
  SELECT count(*) INTO v_total_orders
    FROM public.orders WHERE tenant_id = v_tenant_id;

  -- Recent 30-day order count
  SELECT count(*) INTO v_recent_orders_count
    FROM public.orders
    WHERE tenant_id = v_tenant_id
      AND placed_at >= now() - interval '30 days'
      AND status IN ('pending','processing','shipped','delivered');

  -- Pending orders
  SELECT count(*) INTO v_pending_orders
    FROM public.orders
    WHERE tenant_id = v_tenant_id AND status IN ('pending','processing');

  -- Active customers
  SELECT count(*) INTO v_active_customers
    FROM public.customers WHERE tenant_id = v_tenant_id AND status = 'active';

  -- Total customers
  SELECT count(*) INTO v_total_customers
    FROM public.customers WHERE tenant_id = v_tenant_id;

  -- Total products + low stock
  SELECT count(*), count(*) FILTER (WHERE stock <= reorder_level)
    INTO v_total_products, v_low_stock_count
    FROM public.products WHERE tenant_id = v_tenant_id;

  -- 7-day revenue
  SELECT COALESCE(SUM(total), 0) INTO v_revenue_7d
    FROM public.orders
    WHERE tenant_id = v_tenant_id
      AND placed_at >= now() - interval '7 days'
      AND status != 'cancelled';

  -- Status breakdown
  SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb) INTO v_status_counts
    FROM (
      SELECT status, count(*) as cnt
      FROM public.orders WHERE tenant_id = v_tenant_id
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

-- 7-day daily breakdown RPC
CREATE OR REPLACE FUNCTION public.get_dashboard_daily()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_result jsonb;
BEGIN
  SELECT m.tenant_id INTO v_tenant_id
    FROM public.tenant_memberships m
    WHERE m.user_id = auth.uid() AND m.status = 'active'
    ORDER BY m.created_at LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Khong co quyen' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(d)), '[]'::jsonb) INTO v_result
    FROM (
      SELECT
        date_trunc('day', placed_at)::date as day,
        COALESCE(SUM(total), 0) as revenue,
        count(*) as order_count
      FROM public.orders
      WHERE tenant_id = v_tenant_id
        AND placed_at >= now() - interval '7 days'
        AND status != 'cancelled'
      GROUP BY date_trunc('day', placed_at)
      ORDER BY day
    ) d;

  RETURN v_result;
END;
$$;

-- Low stock products RPC (returns only name, stock, reorder_level — no full table scan on client)
CREATE OR REPLACE FUNCTION public.get_low_stock_products()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_result jsonb;
BEGIN
  SELECT m.tenant_id INTO v_tenant_id
    FROM public.tenant_memberships m
    WHERE m.user_id = auth.uid() AND m.status = 'active'
    ORDER BY m.created_at LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Khong co quyen' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb) INTO v_result
    FROM (
      SELECT id, name, stock, reorder_level
      FROM public.products
      WHERE tenant_id = v_tenant_id AND stock <= reorder_level
      ORDER BY stock ASC
      LIMIT 10
    ) p;

  RETURN v_result;
END;
$$;

-- Revoke anon/PUBLIC
REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_daily() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_low_stock_products() FROM PUBLIC, anon;
