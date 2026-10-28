/*
# Seed demo data for ALL flows — happy case scenarios

## Purpose
Populate every empty table so each role can demo the full end-to-end flow.
Data is organized into 6 scenario groups matching the Flow Guide page:

1. **Admin flow** — Ledger accounts, journal entries, automation rules, webhooks, routing/buffer rules, margin config
2. **Manager flow** — Purchase orders, channel connections, SKU mappings, sync logs, fee breakdowns
3. **Warehouse flow** — Fulfillment waves with orders, stock transfers, inventory batches/serials, order status logs
4. **Returns flow** — Return requests, customer complaints with AI analysis
5. **Finance flow** — Ledger accounts (chart of accounts), journal entries with balanced lines, fee breakdowns
6. **Governance flow** — Automation rules, outbound webhooks, audit logs (existing)

Idempotent: uses ON CONFLICT DO NOTHING where possible, and NOT EXISTS guards for others.
All foreign keys resolved from existing seed data (warehouses, products, customers, orders).
*/

DO $$
DECLARE
  -- Warehouse IDs
  wh_hn uuid := '23d3bd87-8f90-44ea-98ca-79b300b9fa74';
  wh_hcm uuid := 'e71f5766-af04-490d-a160-212c9a4157f2';
  wh_dn uuid := '56a1120b-79bc-4a3e-8a22-9c4b87dc348b';
  -- Product IDs
  p1 uuid := '35715d3a-fd7c-439c-9ac5-a49841efab10'; -- Ao thun
  p2 uuid := '2a01e56c-0702-43ee-828d-8bf6d8e5d91c'; -- Ao so mi
  p3 uuid := '61094bac-69ee-439d-8668-ad5982b87240'; -- Quan jean
  p4 uuid := 'e1a19fdf-6b5c-4fd2-bbeb-437fb1d74835'; -- Giay sneaker
  p5 uuid := 'a562da6f-5572-4536-a09d-2abae3608b7e'; -- Giay tay
  p7 uuid := 'd13cbc08-2a54-4a8c-8878-db51c32b1290'; -- My linh duong
  p9 uuid := '67c4a60d-3128-42fc-8f4d-c0c289daae61'; -- Combo 3 ao thun
  p10 uuid := '6ca07d44-9fe6-436a-b1ac-89a7bfcca921'; -- Tui tote
  -- Customer IDs
  c1 uuid := '67391c33-f8c9-4d82-a900-68a9d0f14b54'; -- Nguyen Van An
  c2 uuid := 'e53e2d26-1daf-4a73-9f89-8a7d2b82b663'; -- Tran Thi Bich
  c3 uuid := 'e00d7d5b-a0d4-4e5e-a523-2d21f1af5a99'; -- Le Minh Cuong
  c4 uuid := '8f8c1dd7-42a0-4e7a-ac92-c5db117bb2e3'; -- Pham Thi Dung
  c6 uuid := 'de43eba6-40c9-4d6c-aed0-87225e8cd92e'; -- Bui Thi Hoa
  -- Order IDs
  o3 uuid := '4833d48f-1768-4876-a373-ad76f8669048'; -- DH-0003 (processing)
  o4 uuid := '3dd2a995-2f93-465f-a9e6-f7dc93dc2b18'; -- DH-0004 (pending)
  o9 uuid := '837c4dee-5b8c-44d7-82bb-b1aefa9371bf'; -- DH-0009 (pending)
  o10 uuid := '6ea633d6-f462-474d-8d2c-be7bff7a8762'; -- DH-0010 (cancelled)
  -- Ledger account IDs (declared, set during insert)
  acc_4000 uuid; acc_1100 uuid; acc_5100 uuid; acc_2100 uuid; acc_3100 uuid;
  je1 uuid; je2 uuid;
BEGIN
  -- ================================================================
  -- 1. LEDGER ACCOUNTS (Chart of Accounts)
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM ledger_accounts LIMIT 1) THEN
    INSERT INTO ledger_accounts (account_code, account_name, account_type, is_active) VALUES
      ('1100', 'Tien mat', 'asset', true),
      ('1200', 'Phai thu khach hang', 'asset', true),
      ('1500', 'Hang ton kho', 'asset', true),
      ('2100', 'Phai tra nha cung cap', 'liability', true),
      ('3100', 'Von dieu le', 'equity', true),
      ('4000', 'Doanh thu ban hang', 'revenue', true),
      ('5100', 'Gia von hang ban', 'expense', true),
      ('5200', 'Phi van chuyen', 'expense', true),
      ('5300', 'Phi hoa hong kenh', 'expense', true),
      ('6000', 'Khau hao tai sanh', 'expense', true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO acc_4000 FROM ledger_accounts WHERE account_code = '4000';
    SELECT id INTO acc_1100 FROM ledger_accounts WHERE account_code = '1100';
    SELECT id INTO acc_5100 FROM ledger_accounts WHERE account_code = '5100';
    SELECT id INTO acc_2100 FROM ledger_accounts WHERE account_code = '2100';
    SELECT id INTO acc_3100 FROM ledger_accounts WHERE account_code = '3100';
  END IF;

  -- ================================================================
  -- 2. JOURNAL ENTRIES (balanced double-entry)
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM journal_entries LIMIT 1) THEN
    SELECT id INTO acc_4000 FROM ledger_accounts WHERE account_code = '4000';
    SELECT id INTO acc_1100 FROM ledger_accounts WHERE account_code = '1100';
    SELECT id INTO acc_5100 FROM ledger_accounts WHERE account_code = '5100';
    SELECT id INTO acc_2100 FROM ledger_accounts WHERE account_code = '2100';

    -- JE-001: Ghi nhan doanh thu don DH-0001
    INSERT INTO journal_entries (entry_number, event_source, reference_id, description, posted_at)
    VALUES ('JE-0001', 'order_delivered', 'DH-0001', 'Ghi nhan doanh thu don DH-0001 — 2 ao thun + 1 quan jean', NOW() - INTERVAL '19 days')
    RETURNING id INTO je1;

    INSERT INTO journal_lines (journal_entry_id, account_id, debit_amount, credit_amount) VALUES
      (je1, acc_1100, 863800, 0),     -- No: Phai thu khach hang
      (je1, acc_4000, 0, 784000),     -- Co: Doanh thu ban hang (subtotal + tax - shipping)
      (je1, acc_1100, 0, 30000);      -- Co: Tien mat (shipping fee)

    -- JE-002: Ghi nhan gia von hang ban DH-0001
    INSERT INTO journal_entries (entry_number, event_source, reference_id, description, posted_at)
    VALUES ('JE-0002', 'order_delivered', 'DH-0001', 'Ghi nhan gia von hang ban DH-0001 — 2 ao thun (85K x2) + 1 quan jean (220K)', NOW() - INTERVAL '19 days')
    RETURNING id INTO je2;

    INSERT INTO journal_lines (journal_entry_id, account_id, debit_amount, credit_amount) VALUES
      (je2, acc_5100, 390000, 0),     -- No: Gia von hang ban
      (je2, acc_1100, 0, 390000);     -- Co: Giam hang ton kho
  END IF;

  -- ================================================================
  -- 3. ORDER FEE BREAKDOWNS (for Shopee/TikTok orders)
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM order_fee_breakdowns LIMIT 1) THEN
    INSERT INTO order_fee_breakdowns (order_id, commission_fee, transaction_fee, voucher_co_fund_fee, estimated_shipping_fee, actual_shipping_fee, weight_penalty_fee, net_payout, is_reconciled, discrepancy_note)
    SELECT o.id, 
      o.total * 0.05,          -- 5% commission
      3000,                     -- transaction fee
      0,                        -- no voucher co-fund
      o.shipping,               -- estimated shipping
      o.shipping + 5000,        -- actual shipping (5K over)
      2000,                     -- weight penalty
      o.total - (o.total * 0.05) - 3000 - 2000 - (o.shipping + 5000),
      false,
      'Chenh lech phi ship 5.000 VND'
    FROM orders o
    WHERE o.order_number IN ('DH-0002', 'DH-0005', 'DH-0008')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ================================================================
  -- 4. FULFILLMENT WAVES (assign pending/processing orders)
  -- ================================================================
  -- Update existing wave if it has 0 orders, or create a new one
  IF NOT EXISTS (SELECT 1 FROM fulfillment_waves WHERE order_count > 0) THEN
    -- Create a wave for HN warehouse with DH-0004
    INSERT INTO fulfillment_waves (warehouse_id, wave_code, status, assigned_picker_id, order_count)
    VALUES (wh_hn, 'WAVE-001', 'picking', 'warehouse@nexusoms.vn', 2)
    ON CONFLICT DO NOTHING;

    -- Assign orders to the wave
    UPDATE orders SET fulfillment_wave_id = (
      SELECT id FROM fulfillment_waves WHERE wave_code = 'WAVE-001' LIMIT 1
    ), status = 'processing'
    WHERE order_number IN ('DH-0004', 'DH-0009');
  END IF;

  -- ================================================================
  -- 5. ORDER STATUS LOGS
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM order_status_log WHERE order_id = o3) THEN
    INSERT INTO order_status_log (order_id, from_status, to_status, note, created_at) VALUES
      (o3, 'pending', 'processing', 'Don da chuyen sang xu ly', NOW() - INTERVAL '20 hours'),
      (o4, NULL, 'pending', 'Tao don moi', NOW() - INTERVAL '2 hours'),
      (o9, NULL, 'pending', 'Tao don moi', NOW() - INTERVAL '3 hours');
  END IF;

  -- ================================================================
  -- 6. STOCK TRANSFERS
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM stock_transfers LIMIT 1) THEN
    INSERT INTO stock_transfers (transfer_number, from_warehouse_id, to_warehouse_id, status, notes)
    VALUES ('TF-0001', wh_hn, wh_hcm, 'in_transit', 'Chuyen 50 ao thun den HCM bo sung')
    RETURNING id INTO je1; -- reuse var

    INSERT INTO stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (je1, p1, 50);

    INSERT INTO stock_transfers (transfer_number, from_warehouse_id, to_warehouse_id, status, notes)
    VALUES ('TF-0002', wh_hcm, wh_dn, 'received', 'Chuyen 20 giay sneaker den Da Nang')
    RETURNING id INTO je2;

    INSERT INTO stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (je2, p4, 20);
  END IF;

  -- ================================================================
  -- 7. PURCHASE ORDERS
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM purchase_orders LIMIT 1) THEN
    INSERT INTO purchase_orders (po_number, warehouse_id, supplier_name, lead_time_days, status, expected_arrival_date, total_amount, notes)
    VALUES ('PO-0001', wh_hn, 'Nha may Detro Co Ltd', 7, 'ordered', (CURRENT_DATE + 7)::date, 17000000, 'Nhap 200 ao thun cotton + 100 ao so mi')
    RETURNING id INTO je1;

    INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost, received_qty) VALUES
      (je1, p1, 200, 85000, 0),
      (je1, p2, 100, 180000, 0);

    INSERT INTO purchase_orders (po_number, warehouse_id, supplier_name, lead_time_days, status, expected_arrival_date, total_amount, notes)
    VALUES ('PO-0002', wh_hcm, 'Moc Kim Garment', 5, 'partial', (CURRENT_DATE - 2)::date, 10500000, 'Nhap 50 tui xach — da nhan 20/50')
    RETURNING id INTO je2;

    INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost, received_qty) VALUES
      (je2, p7, 50, 145000, 20);
  END IF;

  -- ================================================================
  -- 8. INVENTORY BATCHES & SERIALS
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM inventory_batches LIMIT 1) THEN
    INSERT INTO inventory_batches (warehouse_id, product_id, batch_number, expiry_date, import_unit_cost, qty_on_hand, qty_reserved) VALUES
      (wh_hn, p1, 'BATCH-AO-2026-001', NULL, 85000, 80, 5),
      (wh_hn, p7, 'BATCH-ML-2026-001', (CURRENT_DATE + 365)::date, 145000, 200, 0),
      (wh_hcm, p7, 'BATCH-ML-2026-002', (CURRENT_DATE + 300)::date, 145000, 100, 5);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM inventory_serials LIMIT 1) THEN
    INSERT INTO inventory_serials (warehouse_id, product_id, serial_number, status) VALUES
      (wh_hcm, p5, 'IMEI-GT-001', 'in_stock'),
      (wh_hcm, p5, 'IMEI-GT-002', 'in_stock'),
      (wh_hcm, p5, 'IMEI-GT-003', 'reserved'),
      (wh_hcm, p5, 'IMEI-GT-004', 'sold'),
      (wh_hcm, p5, 'IMEI-GT-005', 'in_stock');
  END IF;

  -- ================================================================
  -- 9. CHANNEL CONNECTIONS
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM channel_connections LIMIT 1) THEN
    INSERT INTO channel_connections (channel, shop_name, shop_id, status, last_sync_at, api_key_masked) VALUES
      ('shopee', 'Nexus Fashion Store', '123456789', 'connected', NOW() - INTERVAL '5 minutes', 'sk_shopee_****a1b2'),
      ('tiktok', 'Nexus Official', '987654321', 'connected', NOW() - INTERVAL '15 minutes', 'sk_tiktok_****c3d4'),
      ('lazada', 'Nexus Home Living', '555444333', 'error', NOW() - INTERVAL '2 hours', 'sk_lazada_****e5f6')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ================================================================
  -- 10. CHANNEL SKU MAPPINGS (extra ones)
  -- ================================================================
  INSERT INTO channel_sku_mappings (channel, channel_shop_id, channel_sku_id, internal_product_id)
  SELECT 'shopee', '123456789', 'SHOPEE-AO-001', p1
  WHERE NOT EXISTS (SELECT 1 FROM channel_sku_mappings WHERE channel_sku_id = 'SHOPEE-AO-001');

  INSERT INTO channel_sku_mappings (channel, channel_shop_id, channel_sku_id, internal_product_id)
  SELECT 'shopee', '123456789', 'SHOPEE-GI-001', p4
  WHERE NOT EXISTS (SELECT 1 FROM channel_sku_mappings WHERE channel_sku_id = 'SHOPEE-GI-001');

  INSERT INTO channel_sku_mappings (channel, channel_shop_id, channel_sku_id, internal_product_id)
  SELECT 'tiktok', '987654321', 'TIKTOK-TS-001', (SELECT id FROM products WHERE sku='SP-TS-001')
  WHERE NOT EXISTS (SELECT 1 FROM channel_sku_mappings WHERE channel_sku_id = 'TIKTOK-TS-001');

  INSERT INTO channel_sku_mappings (channel, channel_shop_id, channel_sku_id, internal_product_id)
  SELECT 'tiktok', '987654321', 'TIKTOK-TG-001', p10
  WHERE NOT EXISTS (SELECT 1 FROM channel_sku_mappings WHERE channel_sku_id = 'TIKTOK-TG-001');

  -- ================================================================
  -- 11. SYNC LOGS
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM sync_logs LIMIT 1) THEN
    INSERT INTO sync_logs (channel, shop_name, sync_type, status, message, retry_count, synced_at) VALUES
      ('shopee', 'Nexus Fashion Store', 'stock_push', 'success', 'Da day 45 SKU ton kho', 0, NOW() - INTERVAL '5 minutes'),
      ('shopee', 'Nexus Fashion Store', 'order_pull', 'success', 'Keo 3 don moi', 0, NOW() - INTERVAL '5 minutes'),
      ('tiktok', 'Nexus Official', 'stock_push', 'success', 'Da day 30 SKU ton kho', 0, NOW() - INTERVAL '15 minutes'),
      ('lazada', 'Nexus Home Living', 'stock_push', 'failed', 'Token het han, can lam moi', 3, NOW() - INTERVAL '2 hours'),
      ('shopee', 'Nexus Fashion Store', 'stock_push', 'retrying', 'Timeout lan 1, dang thu lai', 1, NOW() - INTERVAL '30 minutes')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ================================================================
  -- 12. RETURN REQUESTS
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM return_requests LIMIT 1) THEN
    -- RMA cho don DH-0010 (cancelled)
    INSERT INTO return_requests (return_number, order_id, return_type, status, refund_amount, reason, is_refund_without_return, approval_status)
    VALUES ('RMA-0001', o10, 'customer_rma', 'refunded', 467800, 'Khach khong dung size, yeu cau hoan tien', false, 'checker_approved')
    ON CONFLICT DO NOTHING;

    -- RMA cho don DH-0001 (delivered) — dang xu ly
    INSERT INTO return_requests (return_number, order_id, return_type, status, refund_amount, reason, is_refund_without_return, approval_status)
    VALUES ('RMA-0002', (SELECT id FROM orders WHERE order_number='DH-0001'), 'customer_rma', 'quality_check', 398000, 'Ao thun bi lo mang khi nhan', false, 'maker_approved')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ================================================================
  -- 13. CUSTOMER COMPLAINTS (with AI analysis)
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM customer_complaints LIMIT 1) THEN
    INSERT INTO customer_complaints (order_id, customer_id, raw_content, redacted_content, sentiment, urgency_score, issue_category, suggested_reply, analyzed_at, status) VALUES
      (o10, c6, 
       'Toi dat don 2 ao thun nhung nhan hang bi lo mang, rat that voong. So dien thoai cua toi la 0978901234. Yeu cau hoan tien ngay!',
       'Toi dat don 2 ao thun nhung nhan hang bi lo mang, rat that voong. [PHONE_REDACTED]. Yeu cau hoan tien ngay!',
       'negative', 8, 'product_quality',
       'Chao ban, chung toi xin loi vi trai nghiem khong vui. Chung toi se hoan tien 100% trong 24h va gui san pham moi. Vui long gui anh bi lo cho chung toi xac nhan.',
       NOW() - INTERVAL '3 hours', 'responded'),
      (NULL, c2,
       'Dich vu giao hang nhanh, ao dep, chat tot. Se mua lai lan sau!',
       'Dich vu giao hang nhanh, ao dep, chat tot. Se mua lai lan sau!',
       'positive', 2, 'positive_feedback',
       'Cam on ban da tin tuong NexusOMS! Chung toi rat vui ban hai long. Don tiep theo se duoc giam 10%.',
       NOW() - INTERVAL '1 day', 'closed'),
      (o3, c3,
       'Don hang chua giao qua 1 ngay roi, goi hotline khong ai nghe. SDT: 0923456789',
       'Don hang chua giao qua 1 ngay roi, goi hotline khong ai nghe. [PHONE_REDACTED]',
       'negative', 6, 'shipping_delay',
       'Chao ban, don DH-0003 dang o trang thai dang xu ly. Don se duoc giao trong 2 ngay toi. Chung moi da lien lac kho den giao hang.',
       NOW() - INTERVAL '12 hours', 'open')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ================================================================
  -- 14. AUTOMATION RULES
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM order_automation_rules LIMIT 1) THEN
    INSERT INTO order_automation_rules (rule_name, priority, conditions_json, actions_json, is_active, trigger_event) VALUES
      ('Tang qua don tren 500K', 10, 
       '{"order_total": {"gte": 500000}}'::jsonb,
       '{"add_free_gift": "PROMO-BAG", "add_note": "Tang qua khang dinh khach VIP"}'::jsonb,
       true, 'order_created'),
      ('Auto hold margin am', 5,
       '{"estimated_margin": {"lt": 0}}'::jsonb,
       '{"set_status": "on_hold", "hold_reason": "negative_margin", "notify_admin": true}'::jsonb,
       true, 'order_created'),
      ('Canh bao don chua ship qua SLA', 20,
       '{"sla_hours_remaining": {"lte": 0}}'::jsonb,
       '{"notify_warehouse": true, "escalate": true}'::jsonb,
       true, 'order_status_changed')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ================================================================
  -- 15. OUTBOUND WEBHOOKS
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM outbound_webhooks LIMIT 1) THEN
    INSERT INTO outbound_webhooks (name, target_url, event_types, secret, is_active, max_retries) VALUES
      ('Ke toan ERP Sync', 'https://erp.nexusoms.vn/webhooks/orders', 
       ARRAY['order.created', 'order.delivered', 'payment.received'],
       'whsec_abc123def456', true, 3),
      ('CRM Customer Sync', 'https://crm.nexusoms.vn/webhooks/customers',
       ARRAY['customer.created', 'complaint.created'],
       'whsec_xyz789ghi012', true, 5),
      ('Slack Notification', 'https://hooks.slack.com/services/T000/B000/XXX',
       ARRAY['order.cancelled', 'margin.alert', 'sla.breach'],
       'whsec_slack456', true, 2)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ================================================================
  -- 16. BUFFER RULES (safety stock per warehouse/product)
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM buffer_rules LIMIT 1) THEN
    INSERT INTO buffer_rules (warehouse_id, product_id, safety_stock, reorder_point, push_ratio_percent) VALUES
      (wh_hn, p1, 20, 30, 100.00),
      (wh_hn, p9, 10, 15, 80.00),
      (wh_hcm, p4, 10, 15, 100.00),
      (wh_hcm, p5, 8, 10, 90.00),
      (wh_dn, p1, 20, 30, 100.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ================================================================
  -- 17. ROUTING RULES
  -- ================================================================
  IF NOT EXISTS (SELECT 1 FROM routing_rules LIMIT 1) THEN
    INSERT INTO routing_rules (name, priority, channel, preferred_warehouse_id, strategy, is_active) VALUES
      ('Shopee -> Kho HCM', 1, 'shopee', wh_hcm, 'priority', true),
      ('TikTok -> Kho HN', 2, 'tiktok', wh_hn, 'priority', true),
      ('Website -> Kho gan nhat', 10, 'website', NULL, 'nearest', true),
      ('Manual -> Kho uu tien', 99, 'manual', wh_hn, 'priority', true),
      ('Lazada -> Nhieu ton nhat', 5, 'lazada', NULL, 'most_stock', true)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
