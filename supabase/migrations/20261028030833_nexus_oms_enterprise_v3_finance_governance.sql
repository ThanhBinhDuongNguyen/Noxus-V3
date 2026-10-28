/*
# NexusOMS Enterprise v3.0 — Finance, Fulfillment, Governance & Post-Purchase Schema

1. New Tables: fulfillment_waves, order_automation_rules, order_evidence_media, ledger_accounts, journal_entries, journal_lines, order_fee_breakdowns, return_requests, customer_complaints, audit_logs (SHA-256 hash chain), outbound_webhooks, webhook_delivery_logs, margin_config
2. Modified Tables: customers (adds phone_hash, masked_phone, total_spend, return_rate, loyalty_points, tier, rfm_score)
3. Functions: append_audit_log (hash chain), verify_audit_chain
4. Security: RLS on all new tables, SECURITY DEFINER for audit functions
*/

-- ---------- fulfillment_waves ----------
CREATE TABLE IF NOT EXISTS fulfillment_waves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  wave_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','picking','packing','completed','cancelled')),
  assigned_picker_id text,
  order_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fulfillment_waves ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON fulfillment_waves TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_fulfillment_waves" ON fulfillment_waves;
CREATE POLICY "anon_select_fulfillment_waves" ON fulfillment_waves FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_fulfillment_waves" ON fulfillment_waves;
CREATE POLICY "anon_insert_fulfillment_waves" ON fulfillment_waves FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_fulfillment_waves" ON fulfillment_waves;
CREATE POLICY "anon_update_fulfillment_waves" ON fulfillment_waves FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_fulfillment_waves" ON fulfillment_waves;
CREATE POLICY "anon_delete_fulfillment_waves" ON fulfillment_waves FOR DELETE TO anon, authenticated USING (true);

-- ---------- order_automation_rules ----------
CREATE TABLE IF NOT EXISTS order_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  conditions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  trigger_event text NOT NULL DEFAULT 'order_created' CHECK (trigger_event IN ('order_created','order_status_changed','payment_received')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE order_automation_rules ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_automation_rules TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_order_automation_rules" ON order_automation_rules;
CREATE POLICY "anon_select_order_automation_rules" ON order_automation_rules FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_order_automation_rules" ON order_automation_rules;
CREATE POLICY "anon_insert_order_automation_rules" ON order_automation_rules FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_order_automation_rules" ON order_automation_rules;
CREATE POLICY "anon_update_order_automation_rules" ON order_automation_rules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_order_automation_rules" ON order_automation_rules;
CREATE POLICY "anon_delete_order_automation_rules" ON order_automation_rules FOR DELETE TO anon, authenticated USING (true);

-- ---------- order_evidence_media ----------
CREATE TABLE IF NOT EXISTS order_evidence_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  station_type text NOT NULL CHECK (station_type IN ('packing','unboxing_return')),
  video_s3_key text NOT NULL,
  scale_weight_grams integer,
  recorded_by text DEFAULT 'system',
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE order_evidence_media ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_evidence_media TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_order_evidence_media" ON order_evidence_media;
CREATE POLICY "anon_select_order_evidence_media" ON order_evidence_media FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_order_evidence_media" ON order_evidence_media;
CREATE POLICY "anon_insert_order_evidence_media" ON order_evidence_media FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_order_evidence_media" ON order_evidence_media;
CREATE POLICY "anon_update_order_evidence_media" ON order_evidence_media FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_order_evidence_media" ON order_evidence_media;
CREATE POLICY "anon_delete_order_evidence_media" ON order_evidence_media FOR DELETE TO anon, authenticated USING (true);

-- ---------- ledger_accounts ----------
CREATE TABLE IF NOT EXISTS ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text UNIQUE NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  parent_account_id uuid REFERENCES ledger_accounts(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ledger_accounts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON ledger_accounts TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_ledger_accounts" ON ledger_accounts;
CREATE POLICY "anon_select_ledger_accounts" ON ledger_accounts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ledger_accounts" ON ledger_accounts;
CREATE POLICY "anon_insert_ledger_accounts" ON ledger_accounts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_ledger_accounts" ON ledger_accounts;
CREATE POLICY "anon_update_ledger_accounts" ON ledger_accounts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ledger_accounts" ON ledger_accounts;
CREATE POLICY "anon_delete_ledger_accounts" ON ledger_accounts FOR DELETE TO anon, authenticated USING (true);

-- ---------- journal_entries ----------
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number text UNIQUE NOT NULL,
  event_source text NOT NULL,
  reference_id text,
  description text,
  posted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON journal_entries TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_journal_entries" ON journal_entries;
CREATE POLICY "anon_select_journal_entries" ON journal_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_journal_entries" ON journal_entries;
CREATE POLICY "anon_insert_journal_entries" ON journal_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_journal_entries" ON journal_entries;
CREATE POLICY "anon_delete_journal_entries" ON journal_entries FOR DELETE TO anon, authenticated USING (true);

-- ---------- journal_lines ----------
CREATE TABLE IF NOT EXISTS journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  debit_amount numeric(14,2) NOT NULL DEFAULT 0,
  credit_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON journal_lines TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_journal_lines" ON journal_lines;
CREATE POLICY "anon_select_journal_lines" ON journal_lines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_journal_lines" ON journal_lines;
CREATE POLICY "anon_insert_journal_lines" ON journal_lines FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ---------- order_fee_breakdowns ----------
CREATE TABLE IF NOT EXISTS order_fee_breakdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  commission_fee numeric(12,2) NOT NULL DEFAULT 0,
  transaction_fee numeric(12,2) NOT NULL DEFAULT 0,
  voucher_co_fund_fee numeric(12,2) NOT NULL DEFAULT 0,
  estimated_shipping_fee numeric(12,2) NOT NULL DEFAULT 0,
  actual_shipping_fee numeric(12,2) NOT NULL DEFAULT 0,
  weight_penalty_fee numeric(12,2) NOT NULL DEFAULT 0,
  net_payout numeric(12,2) NOT NULL DEFAULT 0,
  is_reconciled boolean NOT NULL DEFAULT false,
  discrepancy_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE order_fee_breakdowns ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_fee_breakdowns TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_order_fee_breakdowns" ON order_fee_breakdowns;
CREATE POLICY "anon_select_order_fee_breakdowns" ON order_fee_breakdowns FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_order_fee_breakdowns" ON order_fee_breakdowns;
CREATE POLICY "anon_insert_order_fee_breakdowns" ON order_fee_breakdowns FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_order_fee_breakdowns" ON order_fee_breakdowns;
CREATE POLICY "anon_update_order_fee_breakdowns" ON order_fee_breakdowns FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_order_fee_breakdowns" ON order_fee_breakdowns;
CREATE POLICY "anon_delete_order_fee_breakdowns" ON order_fee_breakdowns FOR DELETE TO anon, authenticated USING (true);

-- ---------- return_requests ----------
CREATE TABLE IF NOT EXISTS return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number text UNIQUE NOT NULL,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  return_type text NOT NULL CHECK (return_type IN ('customer_rma','failed_delivery_rts')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','received','quality_check','refunded','closed')),
  refund_amount numeric(12,2) NOT NULL DEFAULT 0,
  reason text,
  carrier_deadline_date date,
  evidence_media_id uuid REFERENCES order_evidence_media(id) ON DELETE SET NULL,
  is_refund_without_return boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','maker_approved','checker_approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON return_requests TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_return_requests" ON return_requests;
CREATE POLICY "anon_select_return_requests" ON return_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_return_requests" ON return_requests;
CREATE POLICY "anon_insert_return_requests" ON return_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_return_requests" ON return_requests;
CREATE POLICY "anon_update_return_requests" ON return_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_return_requests" ON return_requests;
CREATE POLICY "anon_delete_return_requests" ON return_requests FOR DELETE TO anon, authenticated USING (true);

-- ---------- extend customers ----------
DO $$ BEGIN
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_hash text;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS masked_phone text;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spend numeric(14,2) NOT NULL DEFAULT 0;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS return_rate numeric(5,2) NOT NULL DEFAULT 0;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard','silver','gold','platinum'));
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS rfm_score text;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ---------- customer_complaints ----------
CREATE TABLE IF NOT EXISTS customer_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  raw_content text,
  redacted_content text,
  sentiment text CHECK (sentiment IN ('positive','neutral','negative','mixed')),
  urgency_score integer CHECK (urgency_score >= 1 AND urgency_score <= 10),
  issue_category text,
  suggested_reply text,
  analyzed_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','analyzed','responded','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE customer_complaints ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_complaints TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_customer_complaints" ON customer_complaints;
CREATE POLICY "anon_select_customer_complaints" ON customer_complaints FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_customer_complaints" ON customer_complaints;
CREATE POLICY "anon_insert_customer_complaints" ON customer_complaints FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_customer_complaints" ON customer_complaints;
CREATE POLICY "anon_update_customer_complaints" ON customer_complaints FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_customer_complaints" ON customer_complaints;
CREATE POLICY "anon_delete_customer_complaints" ON customer_complaints FOR DELETE TO anon, authenticated USING (true);

-- ---------- audit_logs (SHA-256 hash chain) ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text NOT NULL DEFAULT 'system',
  action text NOT NULL,
  entity_ref text,
  payload_json jsonb,
  prev_hash text,
  current_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON audit_logs TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_audit_logs" ON audit_logs;
CREATE POLICY "anon_select_audit_logs" ON audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_audit_logs" ON audit_logs;
CREATE POLICY "anon_insert_audit_logs" ON audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ---------- outbound_webhooks ----------
CREATE TABLE IF NOT EXISTS outbound_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_url text NOT NULL,
  event_types text[] NOT NULL DEFAULT '{}',
  secret text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  max_retries integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE outbound_webhooks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON outbound_webhooks TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_outbound_webhooks" ON outbound_webhooks;
CREATE POLICY "anon_select_outbound_webhooks" ON outbound_webhooks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_outbound_webhooks" ON outbound_webhooks;
CREATE POLICY "anon_insert_outbound_webhooks" ON outbound_webhooks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_outbound_webhooks" ON outbound_webhooks;
CREATE POLICY "anon_update_outbound_webhooks" ON outbound_webhooks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_outbound_webhooks" ON outbound_webhooks;
CREATE POLICY "anon_delete_outbound_webhooks" ON outbound_webhooks FOR DELETE TO anon, authenticated USING (true);

-- ---------- webhook_delivery_logs ----------
CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES outbound_webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  status_code integer,
  response_body text,
  attempt_number integer NOT NULL DEFAULT 1,
  delivered_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE webhook_delivery_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON webhook_delivery_logs TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_webhook_delivery_logs" ON webhook_delivery_logs;
CREATE POLICY "anon_select_webhook_delivery_logs" ON webhook_delivery_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_webhook_delivery_logs" ON webhook_delivery_logs;
CREATE POLICY "anon_insert_webhook_delivery_logs" ON webhook_delivery_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ---------- margin_config ----------
CREATE TABLE IF NOT EXISTS margin_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_margin_percent numeric(5,2) NOT NULL DEFAULT 5.00,
  max_loss_per_order numeric(12,2) NOT NULL DEFAULT 500000,
  circuit_breaker_enabled boolean NOT NULL DEFAULT true,
  auto_zero_stock_on_trigger boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE margin_config ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON margin_config TO anon, authenticated;
DROP POLICY IF EXISTS "anon_select_margin_config" ON margin_config;
CREATE POLICY "anon_select_margin_config" ON margin_config FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_margin_config" ON margin_config;
CREATE POLICY "anon_insert_margin_config" ON margin_config FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_margin_config" ON margin_config;
CREATE POLICY "anon_update_margin_config" ON margin_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_margin_config" ON margin_config;
CREATE POLICY "anon_delete_margin_config" ON margin_config FOR DELETE TO anon, authenticated USING (true);

-- ---------- sequences & functions ----------
CREATE SEQUENCE IF NOT EXISTS journal_entry_seq START 1;
CREATE OR REPLACE FUNCTION next_journal_entry_number()
RETURNS text LANGUAGE sql AS $$
  SELECT 'JE-' || lpad(nextval('journal_entry_seq')::text, 6, '0')
$$;
GRANT USAGE ON SEQUENCE journal_entry_seq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION next_journal_entry_number() TO anon, authenticated;

CREATE SEQUENCE IF NOT EXISTS return_number_seq START 1;
CREATE OR REPLACE FUNCTION next_return_number()
RETURNS text LANGUAGE sql AS $$
  SELECT 'RMA-' || lpad(nextval('return_number_seq')::text, 6, '0')
$$;
GRANT USAGE ON SEQUENCE return_number_seq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION next_return_number() TO anon, authenticated;

CREATE SEQUENCE IF NOT EXISTS wave_code_seq START 1;
CREATE OR REPLACE FUNCTION next_wave_code()
RETURNS text LANGUAGE sql AS $$
  SELECT 'WAVE-' || lpad(nextval('wave_code_seq')::text, 5, '0')
$$;
GRANT USAGE ON SEQUENCE wave_code_seq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION next_wave_code() TO anon, authenticated;

-- ---------- audit hash chain function ----------
CREATE OR REPLACE FUNCTION append_audit_log(
  p_actor_id text,
  p_action text,
  p_entity_ref text,
  p_payload jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prev_hash text;
  v_new_hash text;
  v_id uuid;
  v_payload_str text;
  v_created_at timestamptz;
BEGIN
  v_created_at := now();
  SELECT current_hash INTO v_prev_hash FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT 1;
  v_payload_str := coalesce(p_payload::text, '{}');
  v_new_hash := encode(
    digest(
      coalesce(v_prev_hash, 'GENESIS') || '|' || v_payload_str || '|' || p_action || '|' || coalesce(p_entity_ref, '') || '|' || v_created_at::text,
      'sha256'
    ),
    'hex'
  );
  INSERT INTO audit_logs (id, actor_id, action, entity_ref, payload_json, prev_hash, current_hash, created_at)
  VALUES (gen_random_uuid(), p_actor_id, p_action, p_entity_ref, p_payload, v_prev_hash, v_new_hash, v_created_at)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION append_audit_log(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION append_audit_log(text, text, text, jsonb) TO anon, authenticated;

-- ---------- verify audit chain function ----------
CREATE OR REPLACE FUNCTION verify_audit_chain()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
  v_prev_hash := null;
  FOR v_rec IN SELECT * FROM audit_logs ORDER BY created_at ASC, id ASC LOOP
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
REVOKE EXECUTE ON FUNCTION verify_audit_chain() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_audit_chain() TO anon, authenticated;

-- ---------- triggers ----------
DROP TRIGGER IF EXISTS fulfillment_waves_touch ON fulfillment_waves;
CREATE TRIGGER fulfillment_waves_touch BEFORE UPDATE ON fulfillment_waves
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS order_automation_rules_touch ON order_automation_rules;
CREATE TRIGGER order_automation_rules_touch BEFORE UPDATE ON order_automation_rules
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS return_requests_touch ON return_requests;
CREATE TRIGGER return_requests_touch BEFORE UPDATE ON return_requests
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS customer_complaints_touch ON customer_complaints;
CREATE TRIGGER customer_complaints_touch BEFORE UPDATE ON customer_complaints
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS outbound_webhooks_touch ON outbound_webhooks;
CREATE TRIGGER outbound_webhooks_touch BEFORE UPDATE ON outbound_webhooks
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS margin_config_touch ON margin_config;
CREATE TRIGGER margin_config_touch BEFORE UPDATE ON margin_config
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS fee_breakdowns_touch ON order_fee_breakdowns;
CREATE TRIGGER fee_breakdowns_touch BEFORE UPDATE ON order_fee_breakdowns
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------- indexes ----------
CREATE INDEX IF NOT EXISTS idx_fulfillment_waves_wh ON fulfillment_waves(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_waves_status ON fulfillment_waves(status);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON order_automation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_evidence_order ON order_evidence_media(order_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_ref ON journal_entries(reference_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_fee_breakdown_order ON order_fee_breakdowns(order_id);
CREATE INDEX IF NOT EXISTS idx_fee_breakdown_reconciled ON order_fee_breakdowns(is_reconciled);
CREATE INDEX IF NOT EXISTS idx_returns_order ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON return_requests(status);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON customer_complaints(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_ref);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON outbound_webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_webhook ON webhook_delivery_logs(webhook_id);
