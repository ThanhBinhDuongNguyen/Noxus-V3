/*
# Add tenant_id to all business tables + backfill

## Purpose
Adds a nullable tenant_id column to every business table so existing data
can be backfilled, then adds a default value and index. The column is left
nullable in this migration — a later migration will set NOT NULL after
verifying all rows are populated.

## Tables modified (25 tables):
- customers, products, brands, warehouses, warehouse_bins
- orders, order_items, order_status_log, order_automation_rules
- inventory_items, inventory_batches, inventory_serials, channel_stock_pools
- stock_transactions, purchase_orders, purchase_order_items
- stock_transfers, stock_transfer_items, fulfillment_waves
- channel_sku_mappings, channel_connections, sync_logs
- order_evidence_media, order_fee_breakdowns, return_requests
- customer_complaints, outbound_webhooks, webhook_delivery_logs
- ledger_accounts, journal_entries, journal_lines
- audit_logs, margin_config, buffer_rules, routing_rules

## Backfill
All existing rows get the default tenant's id. A DEFAULT is set so new
inserts from the frontend (which may not send tenant_id yet) still work.

## Indexes
Creates an index on tenant_id for every table for query performance.
*/

DO $$
DECLARE
  v_tenant_id uuid;
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
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'default';
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Default tenant not found';
  END IF;

  FOREACH v_table IN ARRAY v_tables LOOP
    -- Add tenant_id column if not exists
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id uuid',
      v_table
    );

    -- Backfill existing rows
    EXECUTE format(
      'UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL',
      v_table, v_tenant_id
    );

    -- Set default for future inserts (frontend may not send tenant_id yet)
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT %L',
      v_table, v_tenant_id
    );

    -- Create index
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON %I (tenant_id)',
      v_table, v_table
    );
  END LOOP;
END $$;
