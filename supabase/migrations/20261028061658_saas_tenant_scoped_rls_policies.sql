/*
# Rewrite RLS: Tenant-scoped policies for all business tables

## Purpose
Replaces every wide-open USING(true) policy with tenant-membership-scoped
checks. Revokes anon access — this app requires sign-in. Each table gets
4 policies (SELECT/INSERT/UPDATE/DELETE) that check the user is an active
member of the tenant that owns the row.

## Approach
- Revoke all privileges from anon on business tables
- Drop all existing policies on business tables
- Grant CRUD to authenticated only
- Create 4 policies per table using a shared membership check pattern

## Security
- SELECT: USING (tenant membership active)
- INSERT: WITH CHECK (tenant membership active)
- UPDATE: USING + WITH CHECK (tenant membership active)
- DELETE: USING (tenant membership active)

This is intentionally permissive within a tenant — all members can CRUD
all data within their tenant. Per-role column restrictions and
SECURITY DEFINER mutations will be layered on in subsequent migrations.
*/

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'customers', 'products', 'brands', 'warehouses', 'warehouse_bins',
    'orders', 'order_items', 'order_status_log', 'order_automation_rules',
    'inventory_items', 'inventory_batches', 'inventory_serials', 'channel_stock_pools',
    'stock_transactions', 'purchase_orders', 'purchase_order_items',
    'stock_transfers', 'stock_transfer_items', 'fulfillment_waves',
    'channel_sku_mappings', 'channel_connections', 'sync_logs',
    'order_evidence_media', 'order_fee_breakdowns', 'return_requests',
    'customer_complaints', 'outbound_webhooks', 'webhook_delivery_logs',
    'ledger_accounts', 'journal_entries', 'journal_lines',
    'audit_logs', 'margin_config', 'buffer_rules', 'routing_rules'
  ];
  v_policy_name text;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    -- Revoke anon privileges
    EXECUTE format('REVOKE ALL ON %I FROM anon', v_table);

    -- Drop all existing policies on this table
    FOR v_policy_name IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = v_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_policy_name, v_table);
    END LOOP;

    -- Grant CRUD to authenticated only
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', v_table);

    -- Create 4 tenant-scoped policies
    EXECUTE format(
      'CREATE POLICY "tenant_select_%s" ON %I FOR SELECT TO authenticated
       USING (EXISTS (SELECT 1 FROM tenant_memberships m WHERE m.tenant_id = %I.tenant_id AND m.user_id = auth.uid() AND m.status = ''active''))',
      v_table, v_table, v_table
    );

    EXECUTE format(
      'CREATE POLICY "tenant_insert_%s" ON %I FOR INSERT TO authenticated
       WITH CHECK (EXISTS (SELECT 1 FROM tenant_memberships m WHERE m.tenant_id = %I.tenant_id AND m.user_id = auth.uid() AND m.status = ''active''))',
      v_table, v_table, v_table
    );

    EXECUTE format(
      'CREATE POLICY "tenant_update_%s" ON %I FOR UPDATE TO authenticated
       USING (EXISTS (SELECT 1 FROM tenant_memberships m WHERE m.tenant_id = %I.tenant_id AND m.user_id = auth.uid() AND m.status = ''active''))
       WITH CHECK (EXISTS (SELECT 1 FROM tenant_memberships m WHERE m.tenant_id = %I.tenant_id AND m.user_id = auth.uid() AND m.status = ''active''))',
      v_table, v_table, v_table, v_table
    );

    EXECUTE format(
      'CREATE POLICY "tenant_delete_%s" ON %I FOR DELETE TO authenticated
       USING (EXISTS (SELECT 1 FROM tenant_memberships m WHERE m.tenant_id = %I.tenant_id AND m.user_id = auth.uid() AND m.status = ''active''))',
      v_table, v_table, v_table
    );
  END LOOP;
END $$;
