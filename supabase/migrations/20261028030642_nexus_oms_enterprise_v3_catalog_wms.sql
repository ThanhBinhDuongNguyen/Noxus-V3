/*
# NexusOMS Enterprise v3.0 — Catalog & WMS Schema

Extends the existing OMS schema with multi-brand, multi-warehouse, BOM/Bundle,
channel SKU mapping, bin locations, batches/serials, and 5-state inventory.

1. New Tables
- `brands` — multi-brand support (tenant grouping)
- `warehouses` — physical warehouse locations with priority
- `warehouse_bins` — granular bin locations (Zone/Aisle/Rack/Bin)
- `bundle_components` — BOM for combo/virtual kit products (parent->child SKU mapping)
- `channel_sku_mappings` — maps internal SKU to channel-specific SKU (Shopee, TikTok, etc.)
- `inventory_items` — 5-state inventory per warehouse per SKU (Physical, Reserved, Available, Unavailable, Incoming)
- `inventory_batches` — batch/lot tracking with expiry (FEFO)
- `inventory_serials` — individual serial/IMEI tracking
- `channel_stock_pools` — dynamic stock pool per channel (ring-fencing + shared)
- `stock_transactions` — immutable stock ledger
- `purchase_orders` — PO with pre-order/incoming stock support
- `stock_transfers` — inter-warehouse transfers (Requested -> InTransit -> Received)

2. Modified Tables
- `products` — adds brand_id, weight_grams, dimensions_cm, sku_type, allow_preorder, is_serialized, moving_avg_cost
- `orders` — adds channel, channel_order_sn, assigned_warehouse_id, estimated_margin, must_ship_by_sla, hold_reason

3. Security
- RLS enabled on all new tables with anon+authenticated CRUD (single-tenant, no auth)
- All policies use USING(true) since data is intentionally shared
*/

-- ---------- brands ----------
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_code text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON brands TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_brands" ON brands;
CREATE POLICY "anon_select_brands" ON brands FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_brands" ON brands;
CREATE POLICY "anon_insert_brands" ON brands FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_brands" ON brands;
CREATE POLICY "anon_update_brands" ON brands FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_brands" ON brands;
CREATE POLICY "anon_delete_brands" ON brands FOR DELETE TO anon, authenticated USING (true);

-- ---------- warehouses ----------
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  address text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON warehouses TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_warehouses" ON warehouses;
CREATE POLICY "anon_select_warehouses" ON warehouses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_warehouses" ON warehouses;
CREATE POLICY "anon_insert_warehouses" ON warehouses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_warehouses" ON warehouses;
CREATE POLICY "anon_update_warehouses" ON warehouses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_warehouses" ON warehouses;
CREATE POLICY "anon_delete_warehouses" ON warehouses FOR DELETE TO anon, authenticated USING (true);

-- ---------- warehouse_bins ----------
CREATE TABLE IF NOT EXISTS warehouse_bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  zone text NOT NULL,
  aisle text NOT NULL,
  rack text NOT NULL,
  bin_code text NOT NULL,
  picking_sequence integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, bin_code)
);
ALTER TABLE warehouse_bins ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON warehouse_bins TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_warehouse_bins" ON warehouse_bins;
CREATE POLICY "anon_select_warehouse_bins" ON warehouse_bins FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_warehouse_bins" ON warehouse_bins;
CREATE POLICY "anon_insert_warehouse_bins" ON warehouse_bins FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_warehouse_bins" ON warehouse_bins;
CREATE POLICY "anon_update_warehouse_bins" ON warehouse_bins FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_warehouse_bins" ON warehouse_bins;
CREATE POLICY "anon_delete_warehouse_bins" ON warehouse_bins FOR DELETE TO anon, authenticated USING (true);

-- ---------- extend products table ----------
DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id) ON DELETE SET NULL;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS sku_type text NOT NULL DEFAULT 'physical' CHECK (sku_type IN ('physical','virtual_bundle'));
  ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_preorder boolean NOT NULL DEFAULT false;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS is_serialized boolean NOT NULL DEFAULT false;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS moving_avg_cost numeric(12,2) NOT NULL DEFAULT 0;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_grams integer;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions_cm text;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS safety_stock integer NOT NULL DEFAULT 5;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ---------- bundle_components (BOM) ----------
CREATE TABLE IF NOT EXISTS bundle_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_bundle_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  child_product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_ratio integer NOT NULL DEFAULT 1 CHECK (quantity_ratio > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_bundle_product_id, child_product_id)
);
ALTER TABLE bundle_components ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON bundle_components TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_bundle_components" ON bundle_components;
CREATE POLICY "anon_select_bundle_components" ON bundle_components FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_bundle_components" ON bundle_components;
CREATE POLICY "anon_insert_bundle_components" ON bundle_components FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_bundle_components" ON bundle_components;
CREATE POLICY "anon_update_bundle_components" ON bundle_components FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_bundle_components" ON bundle_components;
CREATE POLICY "anon_delete_bundle_components" ON bundle_components FOR DELETE TO anon, authenticated USING (true);

-- ---------- channel_sku_mappings ----------
CREATE TABLE IF NOT EXISTS channel_sku_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('website','shopee','tiktok','lazada','manual')),
  channel_shop_id text,
  channel_product_id text,
  channel_sku_id text NOT NULL,
  internal_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel, channel_sku_id)
);
ALTER TABLE channel_sku_mappings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON channel_sku_mappings TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_channel_sku_mappings" ON channel_sku_mappings;
CREATE POLICY "anon_select_channel_sku_mappings" ON channel_sku_mappings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_channel_sku_mappings" ON channel_sku_mappings;
CREATE POLICY "anon_insert_channel_sku_mappings" ON channel_sku_mappings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_channel_sku_mappings" ON channel_sku_mappings;
CREATE POLICY "anon_update_channel_sku_mappings" ON channel_sku_mappings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_channel_sku_mappings" ON channel_sku_mappings;
CREATE POLICY "anon_delete_channel_sku_mappings" ON channel_sku_mappings FOR DELETE TO anon, authenticated USING (true);

-- ---------- inventory_items (5-state) ----------
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  physical_qty integer NOT NULL DEFAULT 0,
  reserved_qty integer NOT NULL DEFAULT 0,
  available_qty integer NOT NULL DEFAULT 0,
  unavailable_qty integer NOT NULL DEFAULT 0,
  incoming_qty integer NOT NULL DEFAULT 0,
  safety_stock integer NOT NULL DEFAULT 5,
  reorder_point integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, product_id)
);
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_items TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_inventory_items" ON inventory_items;
CREATE POLICY "anon_select_inventory_items" ON inventory_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_inventory_items" ON inventory_items;
CREATE POLICY "anon_insert_inventory_items" ON inventory_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_inventory_items" ON inventory_items;
CREATE POLICY "anon_update_inventory_items" ON inventory_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_inventory_items" ON inventory_items;
CREATE POLICY "anon_delete_inventory_items" ON inventory_items FOR DELETE TO anon, authenticated USING (true);

-- ---------- inventory_batches (FEFO) ----------
CREATE TABLE IF NOT EXISTS inventory_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  bin_id uuid REFERENCES warehouse_bins(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number text NOT NULL,
  expiry_date date,
  import_unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  qty_on_hand integer NOT NULL DEFAULT 0,
  qty_reserved integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, batch_number, product_id)
);
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_batches TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_inventory_batches" ON inventory_batches;
CREATE POLICY "anon_select_inventory_batches" ON inventory_batches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_inventory_batches" ON inventory_batches;
CREATE POLICY "anon_insert_inventory_batches" ON inventory_batches FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_inventory_batches" ON inventory_batches;
CREATE POLICY "anon_update_inventory_batches" ON inventory_batches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_inventory_batches" ON inventory_batches;
CREATE POLICY "anon_delete_inventory_batches" ON inventory_batches FOR DELETE TO anon, authenticated USING (true);

-- ---------- inventory_serials (IMEI) ----------
CREATE TABLE IF NOT EXISTS inventory_serials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES inventory_batches(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  serial_number text NOT NULL,
  status text NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock','reserved','sold','returned','defective')),
  current_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(serial_number)
);
ALTER TABLE inventory_serials ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_serials TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_inventory_serials" ON inventory_serials;
CREATE POLICY "anon_select_inventory_serials" ON inventory_serials FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_inventory_serials" ON inventory_serials;
CREATE POLICY "anon_insert_inventory_serials" ON inventory_serials FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_inventory_serials" ON inventory_serials;
CREATE POLICY "anon_update_inventory_serials" ON inventory_serials FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_inventory_serials" ON inventory_serials;
CREATE POLICY "anon_delete_inventory_serials" ON inventory_serials FOR DELETE TO anon, authenticated USING (true);

-- ---------- channel_stock_pools ----------
CREATE TABLE IF NOT EXISTS channel_stock_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('website','shopee','tiktok','lazada','manual')),
  channel_shop_id text,
  ring_fenced_qty integer NOT NULL DEFAULT 0,
  shared_pool_ratio numeric(5,2) NOT NULL DEFAULT 100.00,
  sales_velocity_per_hour numeric(10,2) NOT NULL DEFAULT 0,
  last_rebalanced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, channel, channel_shop_id)
);
ALTER TABLE channel_stock_pools ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON channel_stock_pools TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_channel_stock_pools" ON channel_stock_pools;
CREATE POLICY "anon_select_channel_stock_pools" ON channel_stock_pools FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_channel_stock_pools" ON channel_stock_pools;
CREATE POLICY "anon_insert_channel_stock_pools" ON channel_stock_pools FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_channel_stock_pools" ON channel_stock_pools;
CREATE POLICY "anon_update_channel_stock_pools" ON channel_stock_pools FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_channel_stock_pools" ON channel_stock_pools;
CREATE POLICY "anon_delete_channel_stock_pools" ON channel_stock_pools FOR DELETE TO anon, authenticated USING (true);

-- ---------- stock_transactions (immutable ledger) ----------
CREATE TABLE IF NOT EXISTS stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES inventory_batches(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('inbound','outbound','transfer_out','transfer_in','adjustment','reservation','release','scrap','return_in')),
  quantity_delta integer NOT NULL,
  balance_after integer NOT NULL,
  reference_id text,
  reason text,
  created_by text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON stock_transactions TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_stock_transactions" ON stock_transactions;
CREATE POLICY "anon_select_stock_transactions" ON stock_transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_stock_transactions" ON stock_transactions;
CREATE POLICY "anon_insert_stock_transactions" ON stock_transactions FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ---------- purchase_orders ----------
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  lead_time_days integer NOT NULL DEFAULT 7,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ordered','partial','received','cancelled')),
  expected_arrival_date date,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON purchase_orders TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_purchase_orders" ON purchase_orders;
CREATE POLICY "anon_select_purchase_orders" ON purchase_orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_purchase_orders" ON purchase_orders;
CREATE POLICY "anon_insert_purchase_orders" ON purchase_orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_purchase_orders" ON purchase_orders;
CREATE POLICY "anon_update_purchase_orders" ON purchase_orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_purchase_orders" ON purchase_orders;
CREATE POLICY "anon_delete_purchase_orders" ON purchase_orders FOR DELETE TO anon, authenticated USING (true);

-- ---------- purchase_order_items ----------
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  received_qty integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON purchase_order_items TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_purchase_order_items" ON purchase_order_items;
CREATE POLICY "anon_select_purchase_order_items" ON purchase_order_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_purchase_order_items" ON purchase_order_items;
CREATE POLICY "anon_insert_purchase_order_items" ON purchase_order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_purchase_order_items" ON purchase_order_items;
CREATE POLICY "anon_update_purchase_order_items" ON purchase_order_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_purchase_order_items" ON purchase_order_items;
CREATE POLICY "anon_delete_purchase_order_items" ON purchase_order_items FOR DELETE TO anon, authenticated USING (true);

-- ---------- stock_transfers ----------
CREATE TABLE IF NOT EXISTS stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number text UNIQUE NOT NULL,
  from_warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  to_warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','in_transit','received','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT different_warehouses CHECK (from_warehouse_id <> to_warehouse_id)
);
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON stock_transfers TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_stock_transfers" ON stock_transfers;
CREATE POLICY "anon_select_stock_transfers" ON stock_transfers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_stock_transfers" ON stock_transfers;
CREATE POLICY "anon_insert_stock_transfers" ON stock_transfers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_stock_transfers" ON stock_transfers;
CREATE POLICY "anon_update_stock_transfers" ON stock_transfers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_stock_transfers" ON stock_transfers;
CREATE POLICY "anon_delete_stock_transfers" ON stock_transfers FOR DELETE TO anon, authenticated USING (true);

-- ---------- stock_transfer_items ----------
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON stock_transfer_items TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_stock_transfer_items" ON stock_transfer_items;
CREATE POLICY "anon_select_stock_transfer_items" ON stock_transfer_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_stock_transfer_items" ON stock_transfer_items;
CREATE POLICY "anon_insert_stock_transfer_items" ON stock_transfer_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_stock_transfer_items" ON stock_transfer_items;
CREATE POLICY "anon_update_stock_transfer_items" ON stock_transfer_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_stock_transfer_items" ON stock_transfer_items;
CREATE POLICY "anon_delete_stock_transfer_items" ON stock_transfer_items FOR DELETE TO anon, authenticated USING (true);

-- ---------- extend orders table ----------
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'manual' CHECK (channel IN ('website','shopee','tiktok','lazada','manual'));
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel_order_sn text;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_margin numeric(12,2);
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS must_ship_by_sla timestamptz;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS hold_reason text;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_wave_id uuid;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ---------- extend order_items ----------
DO $$ BEGIN
  ALTER TABLE order_items ADD COLUMN IF NOT EXISTS parent_bundle_product_id uuid;
  ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_cost_mac_snapshot numeric(12,2) DEFAULT 0;
  ALTER TABLE order_items ADD COLUMN IF NOT EXISTS serial_numbers text[];
  ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_free_gift boolean NOT NULL DEFAULT false;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ---------- unique constraint for idempotency on orders ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_orders_channel_sn') THEN
    ALTER TABLE orders ADD CONSTRAINT uq_orders_channel_sn UNIQUE(channel, channel_order_sn);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ---------- indexes ----------
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouse_bins_wh ON warehouse_bins(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_bundle_parent ON bundle_components(parent_bundle_product_id);
CREATE INDEX IF NOT EXISTS idx_bundle_child ON bundle_components(child_product_id);
CREATE INDEX IF NOT EXISTS idx_channel_sku_product ON channel_sku_mappings(internal_product_id);
CREATE INDEX IF NOT EXISTS idx_channel_sku_channel ON channel_sku_mappings(channel);
CREATE INDEX IF NOT EXISTS idx_inventory_wh_product ON inventory_items(warehouse_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_wh_product ON inventory_batches(warehouse_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_serials_product ON inventory_serials(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_serials_status ON inventory_serials(status);
CREATE INDEX IF NOT EXISTS idx_channel_pool_product ON channel_stock_pools(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_txn_product ON stock_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_txn_wh ON stock_transactions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_txn_type ON stock_transactions(type);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON stock_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(channel);
CREATE INDEX IF NOT EXISTS idx_orders_sla ON orders(must_ship_by_sla);
CREATE INDEX IF NOT EXISTS idx_orders_hold ON orders(hold_reason);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_sku_type ON products(sku_type);

-- ---------- triggers for new tables ----------
DROP TRIGGER IF EXISTS warehouses_touch ON warehouses;
CREATE TRIGGER warehouses_touch BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS inventory_items_touch ON inventory_items;
CREATE TRIGGER inventory_items_touch BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS purchase_orders_touch ON purchase_orders;
CREATE TRIGGER purchase_orders_touch BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS stock_transfers_touch ON stock_transfers;
CREATE TRIGGER stock_transfers_touch BEFORE UPDATE ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------- sequences ----------
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 5001;
CREATE OR REPLACE FUNCTION next_po_number()
RETURNS text LANGUAGE sql AS $$
  SELECT 'PO-' || lpad(nextval('po_number_seq')::text, 5, '0')
$$;
GRANT USAGE ON SEQUENCE po_number_seq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION next_po_number() TO anon, authenticated;

CREATE SEQUENCE IF NOT EXISTS transfer_number_seq START 3001;
CREATE OR REPLACE FUNCTION next_transfer_number()
RETURNS text LANGUAGE sql AS $$
  SELECT 'TRF-' || lpad(nextval('transfer_number_seq')::text, 5, '0')
$$;
GRANT USAGE ON SEQUENCE transfer_number_seq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION next_transfer_number() TO anon, authenticated;
