-- ========== Seed du lieu mau tieng Viet ==========

-- ---------- Kho ----------
INSERT INTO warehouses (code, name, address, priority, is_active) VALUES
  ('WH-HN', 'Kho Ha Noi', 'So 123 Nguyen Van Linh, Long Bien, Ha Noi', 1, true),
  ('WH-HCM', 'Kho TP.HCM', '456 Ly Thuong Kiet, Quan 10, TP.HCM', 2, true),
  ('WH-DN', 'Kho Da Nang', '78 Tran Phu, Hai Chau, Da Nang', 3, true)
ON CONFLICT DO NOTHING;

-- ---------- San pham ----------
INSERT INTO products (sku, name, description, category, price, cost, stock, reorder_level, safety_stock, status) VALUES
  ('SP-AO-001', 'Ao thun nam cotton', 'Ao thun 100% cotton, form regular, nhieu size', 'Quan ao nam', 199000, 85000, 150, 30, 20, 'active'),
  ('SP-AO-002', 'Ao so mi nam cong so', 'Ao so mi nam vai oxford, tay dai', 'Quan ao nam', 459000, 180000, 80, 20, 15, 'active'),
  ('SP-QJ-001', 'Quan jean nam slim fit', 'Quan jean vai xuat, form slim fit', 'Quan ao nam', 559000, 220000, 120, 25, 15, 'active'),
  ('SP-GI-001', 'Giay sneaker nam', 'Giay sneaker phoi vai va da, de cao su', 'Giay dep', 890000, 350000, 60, 15, 10, 'active'),
  ('SP-GI-002', 'Giay tay nam da that', 'Giay tay da bo, tay may tay', 'Giay dep', 1290000, 520000, 35, 10, 8, 'active'),
  ('SP-TS-001', 'Tui xach nu da pu', 'Tui xach tay vai kieu, co quai xach va deo cheo', 'Phu kien nu', 690000, 280000, 45, 12, 8, 'active'),
  ('SP-ML-001', 'My linh duong cao cap', 'Linh duong vat ly nang 1kg, mat chuoi', 'Thuc pham', 320000, 145000, 200, 40, 25, 'active'),
  ('SP-CT-001', 'Chen su men lam', 'Chen su phong cach Viet, ve tinh xao', 'Do gia dung', 150000, 60000, 90, 20, 12, 'active'),
  ('SP-CK-001', 'Combo 3 ao thun', 'Combo 3 ao thun cotton mix mau, tiet kiem 20%', 'Quan ao nam', 499000, 240000, 50, 15, 10, 'active'),
  ('SP-TG-001', 'Tui tote vai canvas', 'Tui tote vai canvas co, in hinh dong', 'Phu kien nu', 129000, 45000, 300, 50, 30, 'active')
ON CONFLICT DO NOTHING;

-- ---------- Khach hang ----------
INSERT INTO customers (name, email, phone, company, address, city, state, postal_code, country, status, notes) VALUES
  ('Nguyen Van An', 'an.nguyen@email.com', '0901234567', 'Cong ty TNHH ABC', '12 Le Loi', 'Ha Noi', 'Ha Noi', '10000', 'Viet Nam', 'active', 'Khach VIP, mua hang hang thang'),
  ('Tran Thi Bich', 'bich.tran@email.com', '0912345678', 'CTY Dich Vu XYZ', '78 Tran Hung Dao', 'TP.HCM', 'TP.HCM', '70000', 'Viet Nam', 'active', NULL),
  ('Le Minh Cuong', 'cuong.le@email.com', '0923456789', NULL, '34 Hai Ba Trung', 'Da Nang', 'Da Nang', '50000', 'Viet Nam', 'active', 'Mua le, hay mua quan ao'),
  ('Pham Thi Dung', 'dung.pham@email.com', '0934567890', 'Cua Hang Dung Dung', '56 Nguyen Trai', 'Ha Noi', 'Ha Noi', '10000', 'Viet Nam', 'active', 'Khach buon, mua so luong lon'),
  ('Hoang Van Em', 'em.hoang@email.com', '0945678901', NULL, '90 Pham Van Dong', 'TP.HCM', 'TP.HCM', '70000', 'Viet Nam', 'lead', 'Khach tiem nang, chua tung mua'),
  ('Vo Thi Phuong', 'phuong.vo@email.com', '0956789012', 'Shop Phuong Anh', '23 Le Dai Hanh', 'Hai Phong', 'Hai Phong', '18000', 'Viet Nam', 'active', 'Shop online, ban lai'),
  ('Dang Quoc Giang', 'giang.dang@email.com', '0967890123', NULL, '45 Vo Nguyen Giap', 'Can Tho', 'Can Tho', '90000', 'Viet Nam', 'inactive', 'Da lau khong mua hang'),
  ('Bui Thi Hoa', 'hoa.bui@email.com', '0978901234', 'Hoa Bui Store', '67 Quang Trung', 'TP.HCM', 'TP.HCM', '70000', 'Viet Nam', 'active', 'Khach than thiet')
ON CONFLICT DO NOTHING;

-- ---------- Don hang + Ton kho ----------
DO $$
DECLARE
  wh_hn uuid; wh_hcm uuid; wh_dn uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid; p6 uuid; p7 uuid; p8 uuid; p9 uuid; p10 uuid;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid; c6 uuid;
  o1 uuid; o2 uuid; o3 uuid; o4 uuid; o5 uuid; o6 uuid; o7 uuid; o8 uuid; o9 uuid; o10 uuid;
BEGIN
  SELECT id INTO wh_hn FROM warehouses WHERE code = 'WH-HN';
  SELECT id INTO wh_hcm FROM warehouses WHERE code = 'WH-HCM';
  SELECT id INTO wh_dn FROM warehouses WHERE code = 'WH-DN';

  SELECT id INTO p1 FROM products WHERE sku = 'SP-AO-001';
  SELECT id INTO p2 FROM products WHERE sku = 'SP-AO-002';
  SELECT id INTO p3 FROM products WHERE sku = 'SP-QJ-001';
  SELECT id INTO p4 FROM products WHERE sku = 'SP-GI-001';
  SELECT id INTO p5 FROM products WHERE sku = 'SP-GI-002';
  SELECT id INTO p6 FROM products WHERE sku = 'SP-TS-001';
  SELECT id INTO p7 FROM products WHERE sku = 'SP-ML-001';
  SELECT id INTO p8 FROM products WHERE sku = 'SP-CT-001';
  SELECT id INTO p9 FROM products WHERE sku = 'SP-CK-001';
  SELECT id INTO p10 FROM products WHERE sku = 'SP-TG-001';

  SELECT id INTO c1 FROM customers WHERE email = 'an.nguyen@email.com';
  SELECT id INTO c2 FROM customers WHERE email = 'bich.tran@email.com';
  SELECT id INTO c3 FROM customers WHERE email = 'cuong.le@email.com';
  SELECT id INTO c4 FROM customers WHERE email = 'dung.pham@email.com';
  SELECT id INTO c5 FROM customers WHERE email = 'phuong.vo@email.com';
  SELECT id INTO c6 FROM customers WHERE email = 'hoa.bui@email.com';

  INSERT INTO orders (order_number, customer_id, status, subtotal, tax, shipping, discount, total, payment_status, payment_method, shipping_address, placed_at, channel, assigned_warehouse_id, must_ship_by_sla)
  VALUES ('DH-0001', c1, 'delivered', 758000, 75800, 30000, 0, 863800, 'paid', 'cod', '12 Le Loi, Ha Noi', NOW() - INTERVAL '20 days', 'manual', wh_hn, NOW() - INTERVAL '19 days')
  RETURNING id INTO o1;
  INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total)
  VALUES (o1, p1, 'Ao thun nam cotton', 'SP-AO-001', 2, 199000, 398000),
         (o1, p3, 'Quan jean nam slim fit', 'SP-QJ-001', 1, 559000, 559000);

  INSERT INTO orders (order_number, customer_id, status, subtotal, tax, shipping, discount, total, payment_status, payment_method, shipping_address, placed_at, channel, assigned_warehouse_id, must_ship_by_sla)
  VALUES ('DH-0002', c2, 'shipped', 890000, 89000, 0, 50000, 929000, 'paid', 'bank_transfer', '78 Tran Hung Dao, TP.HCM', NOW() - INTERVAL '5 days', 'shopee', wh_hcm, NOW() - INTERVAL '3 days')
  RETURNING id INTO o2;
  INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total)
  VALUES (o2, p4, 'Giay sneaker nam', 'SP-GI-001', 1, 890000, 890000);

  INSERT INTO orders (order_number, customer_id, status, subtotal, tax, shipping, discount, total, payment_status, payment_method, shipping_address, placed_at, channel, assigned_warehouse_id, must_ship_by_sla)
  VALUES ('DH-0003', c3, 'processing', 459000, 45900, 30000, 0, 534900, 'paid', 'momo', '34 Hai Ba Trung, Da Nang', NOW() - INTERVAL '1 day', 'manual', wh_dn, NOW() + INTERVAL '2 days')
  RETURNING id INTO o3;
  INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total)
  VALUES (o3, p2, 'Ao so mi nam cong so', 'SP-AO-002', 1, 459000, 459000);

  INSERT INTO orders (order_number, customer_id, status, subtotal, tax, shipping, discount, total, payment_status, payment_method, shipping_address, placed_at, channel, assigned_warehouse_id, must_ship_by_sla)
  VALUES ('DH-0004', c4, 'pending', 4990000, 499000, 0, 200000, 5289000, 'unpaid', 'cod', '56 Nguyen Trai, Ha Noi', NOW() - INTERVAL '2 hours', 'manual', wh_hn, NOW() + INTERVAL '3 days')
  RETURNING id INTO o4;
  INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total)
  VALUES (o4, p9, 'Combo 3 ao thun', 'SP-CK-001', 10, 499000, 4990000);

  INSERT INTO orders (order_number, customer_id, status, subtotal, tax, shipping, discount, total, payment_status, payment_method, shipping_address, placed_at, channel, assigned_warehouse_id, must_ship_by_sla)
  VALUES ('DH-0005', c5, 'delivered', 690000, 69000, 30000, 0, 789000, 'paid', 'bank_transfer', '23 Le Dai Hanh, Hai Phong', NOW() - INTERVAL '15 days', 'tiktok', wh_hn, NOW() - INTERVAL '14 days')
  RETURNING id INTO o5;
  INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total)
  VALUES (o5, p6, 'Tui xach nu da pu', 'SP-TS-001', 1, 690000, 690000);

  INSERT INTO orders (order_number, customer_id, status, subtotal, tax, shipping, discount, total, payment_status, payment_method, shipping_address, placed_at, channel, assigned_warehouse_id, must_ship_by_sla)
  VALUES ('DH-0006', c6, 'delivered', 470000, 47000, 30000, 0, 547000, 'paid', 'cod', '67 Quang Trung, TP.HCM', NOW() - INTERVAL '10 days', 'manual', wh_hcm, NOW() - INTERVAL '9 days')
  RETURNING id INTO o6;
  INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total)
  VALUES (o6, p7, 'My linh duong cao cap', 'SP-ML-001', 1, 320000, 320000),
         (o6, p8, 'Chen su men lam', 'SP-CT-001', 1, 150000, 150000);

  INSERT INTO orders (order_number, customer_id, status, subtotal, tax, shipping, discount, total, payment_status, payment_method, shipping_address, placed_at, channel, assigned_warehouse_id, must_ship_by_sla)
  VALUES ('DH-0007', c1, 'shipped', 1290000, 129000, 0, 100000, 1319000, 'paid', 'bank_transfer', '12 Le Loi, Ha Noi', NOW() - INTERVAL '3 days', 'manual', wh_hn, NOW() - INTERVAL '1 day')
  RETURNING id INTO o7;
  INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total)
  VALUES (o7, p5, 'Giay tay nam da that', 'SP-GI-002', 1, 1290000, 1290000);

  INSERT INTO orders (order_number, customer_id, status, subtotal, tax, shipping, discount, total, payment_status, payment_method, shipping_address, placed_at, channel, assigned_warehouse_id, must_ship_by_sla)
  VALUES ('DH-0008', c2, 'delivered', 129000, 12900, 30000, 0, 171900, 'paid', 'momo', '78 Tran Hung Dao, TP.HCM', NOW() - INTERVAL '30 days', 'shopee', wh_hcm, NOW() - INTERVAL '29 days')
  RETURNING id INTO o8;
  INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total)
  VALUES (o8, p10, 'Tui tote vai canvas', 'SP-TG-001', 1, 129000, 129000);

  INSERT INTO orders (order_number, customer_id, status, subtotal, tax, shipping, discount, total, payment_status, payment_method, shipping_address, placed_at, channel, assigned_warehouse_id, must_ship_by_sla)
  VALUES ('DH-0009', c3, 'pending', 499000, 49900, 30000, 0, 578900, 'unpaid', 'cod', '34 Hai Ba Trung, Da Nang', NOW() - INTERVAL '3 hours', 'manual', wh_dn, NOW() + INTERVAL '2 days')
  RETURNING id INTO o9;
  INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total)
  VALUES (o9, p9, 'Combo 3 ao thun', 'SP-CK-001', 1, 499000, 499000);

  INSERT INTO orders (order_number, customer_id, status, subtotal, tax, shipping, discount, total, payment_status, payment_method, shipping_address, placed_at, channel, assigned_warehouse_id, must_ship_by_sla)
  VALUES ('DH-0010', c6, 'cancelled', 398000, 39800, 30000, 0, 467800, 'refunded', 'bank_transfer', '67 Quang Trung, TP.HCM', NOW() - INTERVAL '7 days', 'manual', wh_hcm, NOW() - INTERVAL '5 days')
  RETURNING id INTO o10;
  INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, line_total)
  VALUES (o10, p1, 'Ao thun nam cotton', 'SP-AO-001', 2, 199000, 398000);

  -- ---------- Ton kho theo kho ----------
  INSERT INTO inventory_items (warehouse_id, product_id, physical_qty, reserved_qty, available_qty, unavailable_qty, incoming_qty, safety_stock, reorder_point) VALUES
    (wh_hn, p1, 80, 5, 75, 0, 20, 20, 30),
    (wh_hn, p2, 40, 2, 38, 0, 0, 15, 20),
    (wh_hn, p3, 60, 3, 57, 0, 10, 15, 25),
    (wh_hn, p4, 30, 1, 29, 0, 5, 10, 15),
    (wh_hn, p9, 20, 5, 15, 0, 30, 10, 15),
    (wh_hn, p10, 150, 0, 150, 0, 0, 30, 50)
  ON CONFLICT DO NOTHING;

  INSERT INTO inventory_items (warehouse_id, product_id, physical_qty, reserved_qty, available_qty, unavailable_qty, incoming_qty, safety_stock, reorder_point) VALUES
    (wh_hcm, p1, 70, 3, 67, 0, 0, 20, 30),
    (wh_hcm, p4, 30, 2, 28, 2, 0, 10, 15),
    (wh_hcm, p5, 15, 0, 15, 0, 5, 8, 10),
    (wh_hcm, p6, 25, 1, 24, 0, 0, 8, 12),
    (wh_hcm, p7, 100, 5, 95, 0, 50, 25, 40),
    (wh_hcm, p8, 50, 0, 50, 2, 0, 12, 20),
    (wh_hcm, p10, 150, 2, 148, 0, 0, 30, 50)
  ON CONFLICT DO NOTHING;

  INSERT INTO inventory_items (warehouse_id, product_id, physical_qty, reserved_qty, available_qty, unavailable_qty, incoming_qty, safety_stock, reorder_point) VALUES
    (wh_dn, p1, 40, 2, 38, 0, 0, 20, 30),
    (wh_dn, p2, 40, 1, 39, 0, 0, 15, 20),
    (wh_dn, p3, 60, 0, 60, 0, 0, 15, 25),
    (wh_dn, p7, 100, 0, 100, 0, 0, 25, 40),
    (wh_dn, p9, 30, 1, 29, 0, 0, 10, 15)
  ON CONFLICT DO NOTHING;
END $$;
