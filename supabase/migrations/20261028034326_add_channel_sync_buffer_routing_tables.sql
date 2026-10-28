/*
# NexusOMS — New tables for Channel Connections, Sync Monitor, Buffer Rules, Routing Rules

1. New Tables
- `channel_connections`: shop connections to Shopee/TikTok/Lazada/Website
- `sync_logs`: sync log entries per channel
- `buffer_rules`: safety stock & reorder point per SKU per warehouse
- `routing_rules`: warehouse routing rules for auto-assignment

2. Security
- RLS enabled on all tables
- CRUD granted to authenticated (app requires sign-in)
- Owner-scoped: all authenticated users can access (shared tenant data)
*/

-- ---------- channel_connections ----------
CREATE TABLE IF NOT EXISTS channel_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('website','shopee','tiktok','lazada','manual')),
  shop_name text NOT NULL,
  shop_id text NOT NULL,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','disconnected','error')),
  last_sync_at timestamptz,
  api_key_masked text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON channel_connections TO authenticated;
DROP POLICY IF EXISTS "cc_select" ON channel_connections;
CREATE POLICY "cc_select" ON channel_connections FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cc_insert" ON channel_connections;
CREATE POLICY "cc_insert" ON channel_connections FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "cc_update" ON channel_connections;
CREATE POLICY "cc_update" ON channel_connections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "cc_delete" ON channel_connections;
CREATE POLICY "cc_delete" ON channel_connections FOR DELETE TO authenticated USING (true);

-- ---------- sync_logs ----------
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  shop_name text NOT NULL,
  sync_type text NOT NULL DEFAULT 'stock_push',
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','retrying')),
  message text,
  retry_count integer NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON sync_logs TO authenticated;
DROP POLICY IF EXISTS "sl_select" ON sync_logs;
CREATE POLICY "sl_select" ON sync_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sl_insert" ON sync_logs;
CREATE POLICY "sl_insert" ON sync_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ---------- buffer_rules ----------
CREATE TABLE IF NOT EXISTS buffer_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  safety_stock integer NOT NULL DEFAULT 5,
  reorder_point integer NOT NULL DEFAULT 10,
  push_ratio_percent numeric(5,2) NOT NULL DEFAULT 100.00,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, product_id)
);
ALTER TABLE buffer_rules ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON buffer_rules TO authenticated;
DROP POLICY IF EXISTS "br_select" ON buffer_rules;
CREATE POLICY "br_select" ON buffer_rules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "br_insert" ON buffer_rules;
CREATE POLICY "br_insert" ON buffer_rules FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "br_update" ON buffer_rules;
CREATE POLICY "br_update" ON buffer_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "br_delete" ON buffer_rules;
CREATE POLICY "br_delete" ON buffer_rules FOR DELETE TO authenticated USING (true);

-- ---------- routing_rules ----------
CREATE TABLE IF NOT EXISTS routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  channel text CHECK (channel IN ('website','shopee','tiktok','lazada','manual') OR channel IS NULL),
  preferred_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  strategy text NOT NULL DEFAULT 'priority' CHECK (strategy IN ('nearest','priority','most_stock')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON routing_rules TO authenticated;
DROP POLICY IF EXISTS "rr_select" ON routing_rules;
CREATE POLICY "rr_select" ON routing_rules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rr_insert" ON routing_rules;
CREATE POLICY "rr_insert" ON routing_rules FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "rr_update" ON routing_rules;
CREATE POLICY "rr_update" ON routing_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "rr_delete" ON routing_rules;
CREATE POLICY "rr_delete" ON routing_rules FOR DELETE TO authenticated USING (true);

-- ---------- touch triggers ----------
DROP TRIGGER IF EXISTS channel_connections_touch ON channel_connections;
CREATE TRIGGER channel_connections_touch BEFORE UPDATE ON channel_connections
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS buffer_rules_touch ON buffer_rules;
CREATE TRIGGER buffer_rules_touch BEFORE UPDATE ON buffer_rules
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS routing_rules_touch ON routing_rules;
CREATE TRIGGER routing_rules_touch BEFORE UPDATE ON routing_rules
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
