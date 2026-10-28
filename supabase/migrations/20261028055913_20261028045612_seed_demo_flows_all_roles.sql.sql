/*
# Seed demo data for ALL flows — happy case scenarios (v2)

Populate every empty table so each role can demo the full end-to-end flow.
Idempotent: uses ON CONFLICT DO NOTHING and NOT EXISTS guards.
Rows are resolved by natural keys (warehouse name, sku, order_number, customer name)
so this migration is independent of how prior seeds assigned UUIDs.
*/

DO $$
DECLARE
  wh_hn uuid; wh_hcm uuid; wh_dn uuid;
  p_ao_thun uuid; p_ao_somi uuid; p_quan_jean uuid; p_giay_sneaker uuid; p_giay_tay uuid;
  p_my_linh uuid; p_combo3 uuid; p_tui_tote uuid; p_tui_xach uuid;
  c_an uuid; c_bich uuid; c_cuong uuid; c_dung uuid; c_hoa uuid;
  o1 uuid; o3 uuid; o4 uuid; o9 uuid; o10 uuid; o2 uuid; o5 uuid; o8 uuid;
  acc_4000 uuid; acc_1100 uuid; acc_5100 uuid; acc_2100 uuid;
  je1 uuid; je2 uuid;
BEGIN
  SELECT id INTO wh_hn  FROM warehouses WHERE name = 'Kho Ha Noi' LIMIT 1;
  SELECT id INTO wh_hcm FROM warehouses WHERE name = 'Kho TP.HCM' LIMIT 1;
  SELECT id INTO wh_dn  FROM warehouses WHERE name = 'Kho Da Nang' LIMIT 1;

  SELECT id INTO p_ao_thun     FROM products WHERE sku = 'SP-AO-001' LIMIT 1;
  SELECT id INTO p_ao_somi     FROM products WHERE sku = 'SP-AO-002' LIMIT 1;
  SELECT id INTO p_quan_jean   FROM products WHERE sku = 'SP-QJ-001' LIMIT 1;
  SELECT id INTO p_giay_sneaker FROM products WHERE sku = 'SP-GI-001' LIMIT 1;
  SELECT id INTO p_giay_tay    FROM products WHERE sku = 'SP-GI-002' LIMIT 1;
  SELECT id INTO p_my_linh     FROM products WHERE sku = 'SP-ML-001' LIMIT 1;
  SELECT id INTO p_combo3      FROM products WHERE sku = 'SP-CK-001' LIMIT 1;
  SELECT id INTO p_tui_tote    FROM products WHERE sku = 'SP-TG-001' LIMIT 1;
  SELECT id INTO p_tui_xach    FROM products WHERE sku = 'SP-TS-001' LIMIT 1;

  SELECT id INTO c_an   FROM customers WHERE name = 'Nguyen Van An' LIMIT 1;
  SELECT id INTO c_bich FROM customers WHERE name = 'Tran Thi Bich' LIMIT 1;
  SELECT id INTO c_cuong FROM customers WHERE name = 'Le Minh Cuong' LIMIT 1;
  SELECT id INTO c_dung  FROM customers WHERE name = 'Pham Thi Dung' LIMIT 1;
  SELECT id INTO c_hoa   FROM customers WHERE name = 'Bui Thi Hoa' LIMIT 1;

  SELECT id INTO o1  FROM orders WHERE order_number = 'DH-0001' LIMIT 1;
  SELECT id INTO o2  FROM orders WHERE order_number = 'DH-0002' LIMIT 1;
  SELECT id INTO o3  FROM orders WHERE order_number = 'DH-0003' LIMIT 1;
  SELECT id INTO o4  FROM orders WHERE order_number = 'DH-0004' LIMIT 1;
  SELECT id INTO o5  FROM orders WHERE order_number = 'DH-0005' LIMIT 1;
  SELECT id INTO o8  FROM orders WHERE order_number = 'DH-0008' LIMIT 1;
  SELECT id INTO o9  FROM orders WHERE order_number = 'DH-0009' LIMIT 1;
  SELECT id INTO o10 FROM orders WHERE order_number = 'DH-0010' LIMIT 1;

  -- 1. LEDGER ACCOUNTS
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
  END IF;

  SELECT id INTO acc_4000 FROM ledger_accounts WHERE account_code = '4000' LIMIT 1;
  SELECT id INTO acc_1100 FROM ledger_accounts WHERE account_code = '1100' LIMIT 1;
  SELECT id INTO acc_5100 FROM ledger_accounts WHERE account_code = '5100' LIMIT 1;
  SELECT id INTO acc_2100 FROM ledger_accounts WHERE account_code = '2100' LIMIT 1;

  -- 2. JOURNAL ENTRIES
  IF NOT EXISTS (SELECT 1 FROM journal_entries LIMIT 1) AND acc_4000 IS NOT NULL AND acc_1100 IS NOT NULL AND acc_5100 IS NOT NULL THEN
    INSERT INTO journal_entries (entry_number, event_source, reference_id, description, posted_at)
    VALUES ('JE-0001', 'order_delivered', 'DH-0001', 'Ghi nhan doanh thu don DH-0001 — 2 ao thun + 1 quan jean', NOW() - INTERVAL '19 days')
    RETURNING id INTO je1;
    INSERT INTO journal_lines (journal_entry_id, account_id, debit_amount, credit_amount) VALUES
      (je1, acc_1100, 863800, 0),
      (je1, acc_4000, 0, 784000),
      (je1, acc_1100, 0, 30000);

    INSERT INTO journal_entries (entry_number, event_source, reference_id, description, posted_at)
    VALUES ('JE-0002', 'order_delivered', 'DH-0001', 'Ghi nhan gia von hang ban DH-0001 — 2 ao thun (85K x2) + 1 quan jean (220K)', NOW() - INTERVAL '19 days')
    RETURNING id INTO je2;
    INSERT INTO journal_lines (journal_entry_id, account_id, debit_amount, credit_amount) VALUES
      (je2, acc_5100, 390000, 0),
      (je2, acc_1100, 0, 390000);
  END IF;

  -- 3. ORDER FEE BREAKDOWNS
  IF NOT EXISTS (SELECT 1 FROM order_fee_breakdowns LIMIT 1) THEN
    INSERT INTO order_fee_breakdowns (order_id, commission_fee, transaction_fee, voucher_co_fund_fee, estimated_shipping_fee, actual_shipping_fee, weight_penalty_fee, net_payout, is_reconciled, discrepancy_note)
    SELECT o.id, o.total * 0.05, 3000, 0, o.shipping, o.shipping + 5000, 2000,
      o.total - (o.total * 0.05) - 3000 - 2000 - (o.shipping + 5000),
      false, 'Chenh lech phi ship 5.000 VND'
    FROM orders o
    WHERE o.order_number IN ('DH-0002', 'DH-0005', 'DH-0008')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 4. FULFILLMENT WAVES
  IF NOT EXISTS (SELECT 1 FROM fulfillment_waves WHERE order_count > 0) AND wh_hn IS NOT NULL THEN
    INSERT INTO fulfillment_waves (warehouse_id, wave_code, status, assigned_picker_id, order_count)
    VALUES (wh_hn, 'WAVE-001', 'picking', 'warehouse@nexusoms.vn', 2)
    ON CONFLICT DO NOTHING;
    UPDATE orders SET fulfillment_wave_id = (
      SELECT id FROM fulfillment_waves WHERE wave_code = 'WAVE-001' LIMIT 1
    ), status = 'processing'
    WHERE order_number IN ('DH-0004', 'DH-0009');
  END IF;

  -- 5. ORDER STATUS LOGS
  IF NOT EXISTS (SELECT 1 FROM order_status_log WHERE order_id = o3) THEN
    INSERT INTO order_status_log (order_id, from_status, to_status, note, created_at) VALUES
      (o3, 'pending', 'processing', 'Don da chuyen sang xu ly', NOW() - INTERVAL '20 hours'),
      (o4, NULL, 'pending', 'Tao don moi', NOW() - INTERVAL '2 hours'),
      (o9, NULL, 'pending', 'Tao don moi', NOW() - INTERVAL '3 hours');
  END IF;

  -- 6. STOCK TRANSFERS
  IF NOT EXISTS (SELECT 1 FROM stock_transfers LIMIT 1) AND wh_hn IS NOT NULL AND wh_hcm IS NOT NULL AND wh_dn IS NOT NULL THEN
    INSERT INTO stock_transfers (transfer_number, from_warehouse_id, to_warehouse_id, status, notes)
    VALUES ('TF-0001', wh_hn, wh_hcm, 'in_transit', 'Chuyen 50 ao thun den HCM bo sung')
    RETURNING id INTO je1;
    INSERT INTO stock_transfer_items (transfer_id, product_id, quantity) VALUES (je1, p_ao_thun, 50);

    INSERT INTO stock_transfers (transfer_number, from_warehouse_id, to_warehouse_id, status, notes)
    VALUES ('TF-0002', wh_hcm, wh_dn, 'received', 'Chuyen 20 giay sneaker den Da Nang')
    RETURNING id INTO je2;
    INSERT INTO stock_transfer_items (transfer_id, product_id, quantity) VALUES (je2, p_giay_sneaker, 20);
  END IF;

  -- 7. PURCHASE ORDERS
  IF NOT EXISTS (SELECT 1 FROM purchase_orders LIMIT 1) AND wh_hn IS NOT NULL AND wh_hcm IS NOT NULL THEN
    INSERT INTO purchase_orders (po_number, warehouse_id, supplier_name, lead_time_days, status, expected_arrival_date, total_amount, notes)
    VALUES ('PO-0001', wh_hn, 'Nha may Detro Co Ltd', 7, 'ordered', (CURRENT_DATE + 7)::date, 17000000, 'Nhap 200 ao thun cotton + 100 ao so mi')
    RETURNING id INTO je1;
    INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost, received_qty) VALUES
      (je1, p_ao_thun, 200, 85000, 0),
      (je1, p_ao_somi, 100, 180000, 0);

    INSERT INTO purchase_orders (po_number, warehouse_id, supplier_name, lead_time_days, status, expected_arrival_date, total_amount, notes)
    VALUES ('PO-0002', wh_hcm, 'Moc Kim Garment', 5, 'partial', (CURRENT_DATE - 2)::date, 10500000, 'Nhap 50 tui xach — da nhan 20/50')
    RETURNING id INTO je2;
    INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost, received_qty) VALUES
      (je2, p_tui_xach, 50, 145000, 20);
  END IF;

  -- 8. INVENTORY BATCHES & SERIALS
  IF NOT EXISTS (SELECT 1 FROM inventory_batches LIMIT 1) AND wh_hn IS NOT NULL AND wh_hcm IS NOT NULL THEN
    INSERT INTO inventory_batches (warehouse_id, product_id, batch_number, expiry_date, import_unit_cost, qty_on_hand, qty_reserved) VALUES
      (wh_hn, p_ao_thun, 'BATCH-AO-2026-001', NULL, 85000, 80, 5),
      (wh_hn, p_my_linh, 'BATCH-ML-2026-001', (CURRENT_DATE + 365)::date, 145000, 200, 0),
      (wh_hcm, p_my_linh, 'BATCH-ML-2026-002', (CURRENT_DATE + 300)::date, 145000, 100, 5);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM inventory_serials LIMIT 1) AND wh_hcm IS NOT NULL THEN
    INSERT INTO inventory_serials (warehouse_id, product_id, serial_number, status) VALUES
      (wh_hcm, p_giay_tay, 'IMEI-GT-001', 'in_stock'),
      (wh_hcm, p_giay_tay, 'IMEI-GT-002', 'in_stock'),
      (wh_hcm, p_giay_tay, 'IMEI-GT-003', 'reserved'),
      (wh_hcm, p_giay_tay, 'IMEI-GT-004', 'sold'),
      (wh_hcm, p_giay_tay, 'IMEI-GT-005', 'in_stock');
  END IF;

  -- 9. CHANNEL CONNECTIONS
  IF NOT EXISTS (SELECT 1 FROM channel_connections LIMIT 1) THEN
    INSERT INTO channel_connections (channel, shop_name, shop_id, status, last_sync_at, api_key_masked) VALUES
      ('shopee', 'Nexus Fashion Store', '123456789', 'connected', NOW() - INTERVAL '5 minutes', 'sk_shopee_****a1b2'),
      ('tiktok', 'Nexus Official', '987654321', 'connected', NOW() - INTERVAL '15 minutes', 'sk_tiktok_****c3d4'),
      ('lazada', 'Nexus Home Living', '555444333', 'error', NOW() - INTERVAL '2 hours', 'sk_lazada_****e5f6')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 10. CHANNEL SKU MAPPINGS
  INSERT INTO channel_sku_mappings (channel, channel_shop_id, channel_sku_id, internal_product_id)
  SELECT 'shopee', '123456789', 'SHOPEE-AO-001', p_ao_thun
  WHERE NOT EXISTS (SELECT 1 FROM channel_sku_mappings WHERE channel_sku_id = 'SHOPEE-AO-001');
  INSERT INTO channel_sku_mappings (channel, channel_shop_id, channel_sku_id, internal_product_id)
  SELECT 'shopee', '123456789', 'SHOPEE-GI-001', p_giay_sneaker
  WHERE NOT EXISTS (SELECT 1 FROM channel_sku_mappings WHERE channel_sku_id = 'SHOPEE-GI-001');
  INSERT INTO channel_sku_mappings (channel, channel_shop_id, channel_sku_id, internal_product_id)
  SELECT 'tiktok', '987654321', 'TIKTOK-TS-001', p_tui_xach
  WHERE NOT EXISTS (SELECT 1 FROM channel_sku_mappings WHERE channel_sku_id = 'TIKTOK-TS-001');
  INSERT INTO channel_sku_mappings (channel, channel_shop_id, channel_sku_id, internal_product_id)
  SELECT 'tiktok', '987654321', 'TIKTOK-TG-001', p_tui_tote
  WHERE NOT EXISTS (SELECT 1 FROM channel_sku_mappings WHERE channel_sku_id = 'TIKTOK-TG-001');

  -- 11. SYNC LOGS
  IF NOT EXISTS (SELECT 1 FROM sync_logs LIMIT 1) THEN
    INSERT INTO sync_logs (channel, shop_name, sync_type, status, message, retry_count, synced_at) VALUES
      ('shopee', 'Nexus Fashion Store', 'stock_push', 'success', 'Da day 45 SKU ton kho', 0, NOW() - INTERVAL '5 minutes'),
      ('shopee', 'Nexus Fashion Store', 'order_pull', 'success', 'Keo 3 don moi', 0, NOW() - INTERVAL '5 minutes'),
      ('tiktok', 'Nexus Official', 'stock_push', 'success', 'Da day 30 SKU ton kho', 0, NOW() - INTERVAL '15 minutes'),
      ('lazada', 'Nexus Home Living', 'stock_push', 'failed', 'Token het han, can lam moi', 3, NOW() - INTERVAL '2 hours'),
      ('shopee', 'Nexus Fashion Store', 'stock_push', 'retrying', 'Timeout lan 1, dang thu lai', 1, NOW() - INTERVAL '30 minutes')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 12. RETURN REQUESTS
  IF NOT EXISTS (SELECT 1 FROM return_requests LIMIT 1) THEN
    INSERT INTO return_requests (return_number, order_id, return_type, status, refund_amount, reason, is_refund_without_return, approval_status)
    VALUES ('RMA-0001', o10, 'customer_rma', 'refunded', 467800, 'Khach khong dung size, yeu cau hoan tien', false, 'checker_approved')
    ON CONFLICT DO NOTHING;
    INSERT INTO return_requests (return_number, order_id, return_type, status, refund_amount, reason, is_refund_without_return, approval_status)
    VALUES ('RMA-0002', o1, 'customer_rma', 'quality_check', 398000, 'Ao thun bi lo mang khi nhan', false, 'maker_approved')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 13. CUSTOMER COMPLAINTS
  IF NOT EXISTS (SELECT 1 FROM customer_complaints LIMIT 1) THEN
    INSERT INTO customer_complaints (order_id, customer_id, raw_content, redacted_content, sentiment, urgency_score, issue_category, suggested_reply, analyzed_at, status) VALUES
      (o10, c_hoa,
       'Toi dat don 2 ao thun nhung nhan hang bi lo mang, rat that voong. So dien thoai cua toi la 0978901234. Yeu cau hoan tien ngay!',
       'Toi dat don 2 ao thun nhung nhan hang bi lo mang, rat that voong. [PHONE_REDACTED]. Yeu cau hoan tien ngay!',
       'negative', 8, 'product_quality',
       'Chao ban, chung toi xin loi vi trai nghiem khong vui. Chung toi se hoan tien 100% trong 24h va gui san pham moi. Vui long gui anh bi lo cho chung toi xac nhan.',
       NOW() - INTERVAL '3 hours', 'responded'),
      (NULL, c_bich,
       'Dich vu giao hang nhanh, ao dep, chat tot. Se mua lai lan sau!',
       'Dich vu giao hang nhanh, ao dep, chat tot. Se mua lai lan sau!',
       'positive', 2, 'positive_feedback',
       'Cam on ban da tin tuong NexusOMS! Chung toi rat vui ban hai long. Don tiep theo se duoc giam 10%.',
       NOW() - INTERVAL '1 day', 'closed'),
      (o3, c_cuong,
       'Don hang chua giao qua 1 ngay roi, goi hotline khong ai nghe. SDT: 0923456789',
       'Don hang chua giao qua 1 ngay roi, goi hotline khong ai nghe. [PHONE_REDACTED]',
       'negative', 6, 'shipping_delay',
       'Chao ban, don DH-0003 dang o trang thai dang xu ly. Don se duoc giao trong 2 ngay toi. Chung moi da lien lac kho den giao hang.',
       NOW() - INTERVAL '12 hours', 'open')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 14. AUTOMATION RULES
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

  -- 15. OUTBOUND WEBHOOKS
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

  -- 16. BUFFER RULES
  IF NOT EXISTS (SELECT 1 FROM buffer_rules LIMIT 1) AND wh_hn IS NOT NULL AND wh_hcm IS NOT NULL AND wh_dn IS NOT NULL THEN
    INSERT INTO buffer_rules (warehouse_id, product_id, safety_stock, reorder_point, push_ratio_percent) VALUES
      (wh_hn, p_ao_thun, 20, 30, 100.00),
      (wh_hn, p_combo3, 10, 15, 80.00),
      (wh_hcm, p_giay_sneaker, 10, 15, 100.00),
      (wh_hcm, p_giay_tay, 8, 10, 90.00),
      (wh_dn, p_ao_thun, 20, 30, 100.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 17. ROUTING RULES
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