-- ============================================================
-- GHL Order History Import — 8 Customers, 10 Orders
-- Run this in the Supabase SQL Editor
-- ⚠️  Run supabase-orders-company.sql FIRST
-- ⚠️  Stock levels are NOT touched — inventory is already correct
-- ============================================================

DO $$
DECLARE
  -- Company IDs
  co_cfl uuid;
  co_midbeds uuid;
  co_ductfab uuid;
  co_atech uuid;

  -- Contact IDs
  ct_josh uuid;
  ct_andrew uuid;
  ct_martine uuid;
  ct_ductfab_placeholder uuid;   -- no contact for Duct Fab
  ct_mark uuid;
  ct_william uuid;
  ct_michael uuid;
  ct_ryan uuid;

  -- Product IDs (looked up from existing products table)
  p_lens_37x7 uuid;
  p_lens_279x411 uuid;
  p_lens_279x15 uuid;
  p_ceramic_32_m14 uuid;
  p_ceramic_195_m8 uuid;
  p_ceramic_28_m11 uuid;
  p_d32_dl uuid;
  p_d32_sl uuid;
  p_d28_h11_dl uuid;
  p_d28_h15_dl uuid;
  p_d28_h15_sl uuid;
  p_d15_3d_dl uuid;

  -- Variant IDs (looked up)
  v_id uuid;

  -- Order IDs
  o_id uuid;

BEGIN

  -- ════════════════════════════════════════════════════════════
  -- 1. CREATE COMPANIES
  -- ════════════════════════════════════════════════════════════

  INSERT INTO companies (name, status) VALUES ('CFL Steel Services', 'active') RETURNING id INTO co_cfl;
  INSERT INTO companies (name, status) VALUES ('Mid Beds Locksmiths Ltd', 'active') RETURNING id INTO co_midbeds;
  INSERT INTO companies (name, status) VALUES ('Duct Fab Ltd', 'active') RETURNING id INTO co_ductfab;
  INSERT INTO companies (name, status) VALUES ('A-Tech Fabrications Ltd', 'active') RETURNING id INTO co_atech;

  -- ════════════════════════════════════════════════════════════
  -- 2. CREATE CONTACTS (contact_type = 'Customer', source = 'GHL Import')
  -- ════════════════════════════════════════════════════════════

  INSERT INTO contacts (first_name, last_name, email, phone, company_id, contact_type, source)
  VALUES ('Josh', 'Brown', 'sales@cflsteelservices.co.uk', '+447712614706', co_cfl, 'Customer', 'GHL Import')
  RETURNING id INTO ct_josh;

  INSERT INTO contacts (first_name, last_name, email, phone, company_id, contact_type, source)
  VALUES ('Andrew', 'Burr', 'andy@mblai.co.uk', '+441462811212', co_midbeds, 'Customer', 'GHL Import')
  RETURNING id INTO ct_andrew;

  INSERT INTO contacts (first_name, last_name, email, phone, company_id, contact_type, source)
  VALUES ('Martine', 'Webb-Jenkins', 'martine@starkandgreensmith.com', '+447515422992', null, 'Customer', 'GHL Import')
  RETURNING id INTO ct_martine;

  INSERT INTO contacts (first_name, last_name, email, phone, company_id, contact_type, source)
  VALUES ('Mark', 'Noblett', 'marknoblett@icloud.com', '+447973786037', null, 'Customer', 'GHL Import')
  RETURNING id INTO ct_mark;

  INSERT INTO contacts (first_name, last_name, email, phone, company_id, contact_type, source)
  VALUES ('William', 'Manners', 'admin@a-tech.uk.com', '+441325304033', co_atech, 'Customer', 'GHL Import')
  RETURNING id INTO ct_william;

  INSERT INTO contacts (first_name, last_name, email, phone, company_id, contact_type, source)
  VALUES ('Michael', 'Jacques', 'mail@mejj.co.uk', '+447768031705', null, 'Customer', 'GHL Import')
  RETURNING id INTO ct_michael;

  INSERT INTO contacts (first_name, last_name, email, phone, company_id, contact_type, source)
  VALUES ('Ryan', 'Benson', 'ryanbenson2192@gmail.com', '+447480368774', null, 'Customer', 'GHL Import')
  RETURNING id INTO ct_ryan;

  -- ════════════════════════════════════════════════════════════
  -- 3. LOOK UP EXISTING PRODUCT IDs
  -- ════════════════════════════════════════════════════════════

  SELECT id INTO p_lens_37x7     FROM products WHERE name = 'Protective Lens 37 x 7 6KW' LIMIT 1;
  SELECT id INTO p_lens_279x411  FROM products WHERE name = 'Protective Lens 27.9 x 4.11' LIMIT 1;
  SELECT id INTO p_lens_279x15   FROM products WHERE name = 'Protective Lens 27.9 x 1.5' LIMIT 1;
  SELECT id INTO p_ceramic_32_m14 FROM products WHERE name = 'Ceramic Body Dia. 32 / M14' LIMIT 1;
  SELECT id INTO p_ceramic_195_m8 FROM products WHERE name = 'Ceramic Body Dia. 19.5 / M8' LIMIT 1;
  SELECT id INTO p_ceramic_28_m11 FROM products WHERE name = 'Ceramic Body Dia. 28 / M11' LIMIT 1;
  SELECT id INTO p_d32_dl        FROM products WHERE name = 'D32 H15-M14 Double Layer Nozzle' LIMIT 1;
  SELECT id INTO p_d32_sl        FROM products WHERE name = 'D32 H15-M14 Single Layer Nozzle' LIMIT 1;
  SELECT id INTO p_d28_h11_dl    FROM products WHERE name = 'D28 H11-M11 Double Layer Nozzle' LIMIT 1;
  SELECT id INTO p_d28_h15_dl    FROM products WHERE name = 'D28 H15-M11 Double Layer Nozzle' LIMIT 1;
  SELECT id INTO p_d28_h15_sl    FROM products WHERE name = 'D28 H15-M11 Single Layer Nozzle' LIMIT 1;
  SELECT id INTO p_d15_3d_dl     FROM products WHERE name = 'D15 H19-M8 3D Double Layer Nozzle' LIMIT 1;


  -- ════════════════════════════════════════════════════════════
  -- 4. INSERT ORDERS + ORDER ITEMS
  --    (No stock adjustments — inventory already reflects these)
  -- ════════════════════════════════════════════════════════════

  -- ── ORDER 1: CFL Steel Services — 9 Mar 2026 ──────────────
  INSERT INTO orders (
    contact_id, company_id, customer_email, customer_name, customer_phone,
    shipping_address, subtotal, tax_amount, total,
    status, payment_status, created_at
  ) VALUES (
    ct_josh, co_cfl, 'sales@cflsteelservices.co.uk', 'CFL Steel Services', '+447712614706',
    '{"line1":"Unit 1 & 2 Brook Street, Syston","city":"Leicester","postcode":"LE7 1GD","country":"GB"}'::jsonb,
    31.00, 6.20, 37.20,
    'delivered', 'paid', '2026-03-09 14:10:00+00'
  ) RETURNING id INTO o_id;

  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
  VALUES (o_id, p_lens_37x7, 'Protective Lens 37 x 7 6KW (Pack of 5)', 1, 31.00, 31.00);


  -- ── ORDER 2: Andrew Burr — 17 Feb 2026 (completed) ────────
  INSERT INTO orders (
    contact_id, company_id, customer_email, customer_name, customer_phone,
    shipping_address, subtotal, tax_amount, total,
    status, payment_status, created_at
  ) VALUES (
    ct_andrew, co_midbeds, 'andy@mblai.co.uk', 'Andrew Burr', '+441462811212',
    '{"line1":"Mid Beds Locksmiths Ltd, 3c St Francis Way","city":"Shefford","postcode":"SG17 5DZ","country":"GB"}'::jsonb,
    169.48, 33.90, 203.38,
    'delivered', 'paid', '2026-02-17 09:15:00+00'
  ) RETURNING id INTO o_id;

  -- Look up variant for D32 DL 1.0
  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d32_dl AND pv.option_values @> '[{"value":"1.0"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d32_dl, v_id, 'D32 H15-M14 Double Layer Nozzle (Pack of 10)', '1.0', 1, 53.49, 53.49);

  -- Look up variant for D32 DL 1.5
  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d32_dl AND pv.option_values @> '[{"value":"1.5"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d32_dl, v_id, 'D32 H15-M14 Double Layer Nozzle (Pack of 10)', '1.5', 1, 53.49, 53.49);

  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
  VALUES (o_id, p_ceramic_32_m14, 'Ceramic Body Dia. 32 / M14', 2, 16.50, 33.00);

  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
  VALUES (o_id, p_lens_279x411, 'Protective Lens 27.9 x 4.11 (Pack of 5)', 1, 29.50, 29.50);


  -- ── ORDER 3: Martine Webb-Jenkins — 5 Feb 2026 ────────────
  INSERT INTO orders (
    contact_id, customer_email, customer_name, customer_phone,
    shipping_address, subtotal, tax_amount, total,
    status, payment_status, created_at
  ) VALUES (
    ct_martine, 'martine@starkandgreensmith.com', 'Martine Webb-Jenkins', '+447515422992',
    '{"line1":"Unit 6 John Lory Farmers","city":"Horley","postcode":"RH6 0EB","country":"GB"}'::jsonb,
    53.49, 10.70, 64.19,
    'delivered', 'paid', '2026-02-05 10:46:00+00'
  ) RETURNING id INTO o_id;

  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d32_sl AND pv.option_values @> '[{"value":"2.0"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d32_sl, v_id, 'D32 H15-M14 Single Layer Nozzle (Pack of 10)', '2.0', 1, 53.49, 53.49);


  -- ── ORDER 4: Duct Fab Ltd — 5 Feb 2026 ────────────────────
  -- (No contact — company only)
  INSERT INTO orders (
    company_id, customer_email, customer_name, customer_phone,
    shipping_address, subtotal, tax_amount, total,
    status, payment_status, created_at
  ) VALUES (
    co_ductfab, 'accounts@duct-fab.co.uk', 'Duct Fab Ltd', '+447908741092',
    '{"line1":"Unit 3C","city":"Ware","county":"England","postcode":"SG11 2PB","country":"GB"}'::jsonb,
    82.99, 16.60, 99.59,
    'delivered', 'paid', '2026-02-05 10:27:00+00'
  ) RETURNING id INTO o_id;

  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d32_sl AND pv.option_values @> '[{"value":"2.5"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d32_sl, v_id, 'D32 H15-M14 Single Layer Nozzle (Pack of 10)', '2.5', 1, 53.49, 53.49);

  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
  VALUES (o_id, p_lens_279x411, 'Protective Lens 27.9 x 4.11 (Pack of 5)', 1, 29.50, 29.50);


  -- ── ORDER 5: Mark Noblett — 5 Feb 2026 ─────────────────────
  INSERT INTO orders (
    contact_id, customer_email, customer_name, customer_phone,
    shipping_address, subtotal, tax_amount, total,
    status, payment_status, created_at
  ) VALUES (
    ct_mark, 'marknoblett@icloud.com', 'Mark Noblett', '+447973786037',
    '{"line1":"8 Swift","city":"Tamworth","county":"England","postcode":"B77 2RP","country":"GB"}'::jsonb,
    48.49, 9.70, 58.19,
    'delivered', 'paid', '2026-02-05 08:19:00+00'
  ) RETURNING id INTO o_id;

  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d28_h11_dl AND pv.option_values @> '[{"value":"1.3"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d28_h11_dl, v_id, 'D28 H11-M11 Double Layer Nozzle (Pack of 10)', '1.3', 1, 48.49, 48.49);


  -- ── ORDER 6: William Manners — 26 Jan 2026 (3 items) ──────
  INSERT INTO orders (
    contact_id, company_id, customer_email, customer_name, customer_phone,
    shipping_address, subtotal, tax_amount, total,
    status, payment_status, created_at
  ) VALUES (
    ct_william, co_atech, 'admin@a-tech.uk.com', 'William Manners', '+441325304033',
    '{"line1":"A-Tech Fabrications Ltd","city":"Newton Aycliffe","county":"England","postcode":"DL5 6TX","country":"GB"}'::jsonb,
    144.97, 29.00, 188.96,
    'delivered', 'paid', '2026-01-26 15:07:00+00'
  ) RETURNING id INTO o_id;

  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d28_h15_dl AND pv.option_values @> '[{"value":"1.4"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d28_h15_dl, v_id, 'D28 H15-M11 Double Layer Nozzle (Pack of 10)', '1.4', 1, 49.99, 49.99);

  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d28_h15_dl AND pv.option_values @> '[{"value":"1.6"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d28_h15_dl, v_id, 'D28 H15-M11 Double Layer Nozzle (Pack of 10)', '1.6', 1, 49.99, 49.99);

  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d28_h15_sl AND pv.option_values @> '[{"value":"3.0"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d28_h15_sl, v_id, 'D28 H15-M11 Single Layer Nozzle (Pack of 10)', '3.0', 1, 44.99, 44.99);


  -- ── ORDER 7: William Manners — 9 Jan 2026 (8 items, LASERTECH 10%) ──
  INSERT INTO orders (
    contact_id, company_id, customer_email, customer_name, customer_phone,
    shipping_address, subtotal, discount_amount, discount_code, tax_amount, total,
    status, payment_status, created_at
  ) VALUES (
    ct_william, co_atech, 'admin@a-tech.uk.com', 'William Manners', '+441325304033',
    '{"line1":"A-Tech Fabrications Limited","city":"Newton Aycliffe","county":"England","postcode":"DL5 6TX","country":"GB"}'::jsonb,
    370.93, 37.10, 'LASERTECH', 0, 353.82,
    'delivered', 'paid', '2026-01-09 13:11:00+00'
  ) RETURNING id INTO o_id;

  -- D28 H15-M11 DL — 1.2
  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d28_h15_dl AND pv.option_values @> '[{"value":"1.2"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d28_h15_dl, v_id, 'D28 H15-M11 Double Layer Nozzle (Pack of 10)', '1.2', 1, 49.99, 49.99);

  -- D28 H15-M11 DL — 1.4
  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d28_h15_dl AND pv.option_values @> '[{"value":"1.4"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d28_h15_dl, v_id, 'D28 H15-M11 Double Layer Nozzle (Pack of 10)', '1.4', 1, 49.99, 49.99);

  -- D28 H15-M11 DL — 2.0
  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d28_h15_dl AND pv.option_values @> '[{"value":"2.0"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d28_h15_dl, v_id, 'D28 H15-M11 Double Layer Nozzle (Pack of 10)', '2.0', 1, 49.99, 49.99);

  -- D28 H15-M11 DL — 2.5
  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d28_h15_dl AND pv.option_values @> '[{"value":"2.5"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d28_h15_dl, v_id, 'D28 H15-M11 Double Layer Nozzle (Pack of 10)', '2.5', 1, 49.99, 49.99);

  -- D28 H15-M11 SL — 2.5
  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d28_h15_sl AND pv.option_values @> '[{"value":"2.5"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d28_h15_sl, v_id, 'D28 H15-M11 Single Layer Nozzle (Pack of 10)', '2.5', 1, 44.99, 44.99);

  -- Ceramic Body Dia. 32 / M14 × 2
  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
  VALUES (o_id, p_ceramic_32_m14, 'Ceramic Body Dia. 32 / M14', 2, 13.00, 26.00);

  -- D32 H15-M14 DL — 2.0
  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d32_dl AND pv.option_values @> '[{"value":"2.0"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d32_dl, v_id, 'D32 H15-M14 Double Layer Nozzle (Pack of 10)', '2.0', 1, 49.99, 49.99);

  -- D32 H15-M14 DL — 1.5
  SELECT pv.id INTO v_id FROM product_variants pv
    WHERE pv.product_id = p_d32_dl AND pv.option_values @> '[{"value":"1.5"}]'::jsonb LIMIT 1;
  INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, total_price)
  VALUES (o_id, p_d32_dl, v_id, 'D32 H15-M14 Double Layer Nozzle (Pack of 10)', '1.5', 1, 49.99, 49.99);


  -- ── ORDER 8: Michael Jacques — 19 Jan 2026 ────────────────
  INSERT INTO orders (
    contact_id, customer_email, customer_name, customer_phone,
    shipping_address, subtotal, tax_amount, total,
    status, payment_status, created_at
  ) VALUES (
    ct_michael, 'mail@mejj.co.uk', 'Michael Jacques', '+447768031705',
    '{"line1":"The Manor, Mill Lane","city":"Oxford","county":"England","postcode":"OX44 7SL","country":"GB"}'::jsonb,
    55.00, 11.00, 77.99,
    'delivered', 'paid', '2026-01-19 14:33:00+00'
  ) RETURNING id INTO o_id;

  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
  VALUES (o_id, p_lens_37x7, 'Protective Lens 37 x 7 6KW (Pack of 5)', 2, 27.50, 55.00);


  -- ── ORDER 9: Michael Jacques — 6 Dec 2025 ─────────────────
  INSERT INTO orders (
    contact_id, customer_email, customer_name, customer_phone,
    shipping_address, subtotal, total,
    status, payment_status, created_at
  ) VALUES (
    ct_michael, 'mail@mejj.co.uk', 'Michael Jacques', '+447768031705',
    '{"line1":"The Manor, Mill Lane","city":"Oxford","county":"England","postcode":"OX44 7SL","country":"GB"}'::jsonb,
    55.00, 66.99,
    'delivered', 'paid', '2025-12-06 15:36:00+00'
  ) RETURNING id INTO o_id;

  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
  VALUES (o_id, p_lens_37x7, 'Protective Lens 37 x 7 6KW (Pack of 5)', 2, 27.50, 55.00);


  -- ── ORDER 10: Ryan Benson — 2 Dec 2025 ────────────────────
  INSERT INTO orders (
    contact_id, customer_email, customer_name, customer_phone,
    shipping_address, subtotal, total,
    status, payment_status, created_at
  ) VALUES (
    ct_ryan, 'ryanbenson2192@gmail.com', 'Ryan Benson', '+447480368774',
    '{"line1":"Birmingham","city":"Birmingham","county":"England","postcode":"B77 3NR","country":"GB"}'::jsonb,
    12.00, 15.95,
    'delivered', 'paid', '2025-12-02 18:17:00+00'
  ) RETURNING id INTO o_id;

  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
  VALUES (o_id, p_ceramic_28_m11, 'Ceramic Body Dia. 28 / M11', 1, 12.00, 12.00);


END $$;

-- ─── Done! ──────────────────────────────────────────────────
-- You should now have:
--   4 new companies
--   7 new contacts (linked to companies where applicable)
--   10 new orders (with contact_id and/or company_id)
--   ~25 order_items (matched to existing products/variants)
--   Stock levels UNCHANGED
