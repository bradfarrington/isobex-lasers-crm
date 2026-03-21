-- ============================================================
-- GHL Inventory Import — 16 Products, 112 Total Items
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── 1. Add continue_selling column ─────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS continue_selling_when_out_of_stock boolean DEFAULT false;

-- ─── 1b. Add pack_quantity column ───────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pack_quantity int DEFAULT 1;

-- ─── 2. Insert 8 single-variant products ────────────────────
-- (These have no size variants — stock lives on the product row)

INSERT INTO products (name, product_type, price, sku, is_visible, stock_quantity, continue_selling_when_out_of_stock, pack_quantity)
VALUES
  ('Protective Lens 37 x 7 6KW', 'physical', 0, null, true, 15, false, 5),
  ('Protective Lens 27.9 x 4.11', 'physical', 0, null, true, 18, false, 5),
  ('Ceramic Body Dia. 32 / M14', 'physical', 0, null, true, 16, false, 1),
  ('Ceramic Body Dia. 19.5 / M8', 'physical', 0, null, true, 20, false, 1),
  ('Seal Ring 32.2 x 2.4 x 3.55mm', 'physical', 0, null, true, 20, false, 1),
  ('Ceramic Body Dia. 28 / M11', 'physical', 0, null, true, 20, false, 1),
  ('Seal Ring 42.2 x 4 x 3.2mm', 'physical', 0, null, true, 20, false, 1),
  ('Protective Lens 27.9 x 1.5', 'physical', 0, null, true, 20, false, 5);

-- ─── 3. Insert 8 multi-variant products ─────────────────────
-- (Stock lives on the variant rows, product stock_quantity = 0)

INSERT INTO products (name, product_type, price, sku, is_visible, stock_quantity, continue_selling_when_out_of_stock, pack_quantity)
VALUES
  ('D32 H15-M14 Double Layer Nozzle', 'physical', 0, null, true, 0, false, 10),
  ('D28 H11-M11 Double Layer Nozzle', 'physical', 0, null, true, 0, false, 10),
  ('D32 H15-M14 Single Layer Nozzle', 'physical', 0, null, true, 0, false, 10),
  ('D28 H11-M11 Top Hat Single Layer Nozzle', 'physical', 0, null, true, 0, false, 10),
  ('D28 H15-M11 Double Layer Nozzle', 'physical', 0, null, true, 0, false, 10),
  ('D28 H15-M11 Single Layer Nozzle', 'physical', 0, null, true, 0, false, 10),
  ('D15 H19-M8 3D Double Layer Nozzle', 'physical', 0, null, true, 0, false, 10),
  ('D15 H19-M8 3D Single Layer Nozzle', 'physical', 0, null, true, 0, false, 10);

-- ─── 4. Create option groups + values + variants ────────────
-- Each of the 8 nozzle products gets a "Size" option group
-- with 13 size values, and 13 corresponding variants.

DO $$
DECLARE
  p_id uuid;
  og_id uuid;
  ov_ids uuid[];
  ov_id uuid;
  i int;

  -- Size values (same 13 sizes for all nozzle products)
  sizes text[] := ARRAY['0.8','1.0','1.2','1.3','1.4','1.5','1.6','1.8','2.0','2.5','3.0','3.5','4.0'];

  -- ── D32 H15-M14 Double Layer ──
  d32_dl_stock int[] := ARRAY[5, 4, 5, 5, 5, 3, 5, 5, 4, 2, 2, 2, 2];
  -- sizes:                      0.8 1.0 1.2 1.3 1.4 1.5 1.6 1.8 2.0 2.5 3.0 3.5 4.0

  -- ── D28 H11-M11 Double Layer ──
  d28_h11_dl_stock int[] := ARRAY[5, 5, 5, 5, 5, 5, 5, 5, 5, 2, 2, 2, 2];

  -- ── D32 H15-M14 Single Layer ──
  d32_sl_stock int[] := ARRAY[5, 5, 5, 5, 5, 5, 5, 5, 4, 1, 2, 2, 2];

  -- ── D28 H11-M11 Top Hat Single Layer ──
  d28_th_stock int[] := ARRAY[5, 5, 5, 5, 5, 5, 5, 5, 5, 2, 2, 2, 2];

  -- ── D28 H15-M11 Double Layer ──
  d28_h15_dl_stock int[] := ARRAY[5, 5, 4, 5, 3, 5, 4, 5, 4, 1, 2, 2, 2];

  -- ── D28 H15-M11 Single Layer ──
  d28_h15_sl_stock int[] := ARRAY[5, 5, 5, 5, 5, 5, 5, 5, 5, 1, 1, 2, 2];

  -- ── D15 H19-M8 3D Double Layer ──
  d15_3d_dl_stock int[] := ARRAY[5, 5, 5, 5, 4, 5, 5, 5, 5, 2, 2, 2, 2];

  -- ── D15 H19-M8 3D Single Layer ──
  d15_3d_sl_stock int[] := ARRAY[5, 5, 4, 5, 5, 4, 5, 5, 5, 2, 2, 2, 2];

BEGIN

  -- ════════════════════════════════════════════════
  -- Helper: for each nozzle product, create option group, values, and variants
  -- ════════════════════════════════════════════════

  -- ── 1. D32 H15-M14 Double Layer Nozzle ──
  SELECT id INTO p_id FROM products WHERE name = 'D32 H15-M14 Double Layer Nozzle' LIMIT 1;
  INSERT INTO product_option_groups (product_id, name, sort_order) VALUES (p_id, 'Size', 0) RETURNING id INTO og_id;
  ov_ids := ARRAY[]::uuid[];
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_option_values (option_group_id, value, sort_order) VALUES (og_id, sizes[i], i - 1) RETURNING id INTO ov_id;
    ov_ids := ov_ids || ov_id;
  END LOOP;
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_variants (product_id, option_values, sku, stock_quantity)
    VALUES (p_id, jsonb_build_array(jsonb_build_object('group_id', og_id, 'group_name', 'Size', 'value_id', ov_ids[i], 'value', sizes[i])), null, d32_dl_stock[i]);
  END LOOP;

  -- ── 2. D28 H11-M11 Double Layer Nozzle ──
  SELECT id INTO p_id FROM products WHERE name = 'D28 H11-M11 Double Layer Nozzle' LIMIT 1;
  INSERT INTO product_option_groups (product_id, name, sort_order) VALUES (p_id, 'Size', 0) RETURNING id INTO og_id;
  ov_ids := ARRAY[]::uuid[];
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_option_values (option_group_id, value, sort_order) VALUES (og_id, sizes[i], i - 1) RETURNING id INTO ov_id;
    ov_ids := ov_ids || ov_id;
  END LOOP;
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_variants (product_id, option_values, sku, stock_quantity)
    VALUES (p_id, jsonb_build_array(jsonb_build_object('group_id', og_id, 'group_name', 'Size', 'value_id', ov_ids[i], 'value', sizes[i])), null, d28_h11_dl_stock[i]);
  END LOOP;

  -- ── 3. D32 H15-M14 Single Layer Nozzle ──
  SELECT id INTO p_id FROM products WHERE name = 'D32 H15-M14 Single Layer Nozzle' LIMIT 1;
  INSERT INTO product_option_groups (product_id, name, sort_order) VALUES (p_id, 'Size', 0) RETURNING id INTO og_id;
  ov_ids := ARRAY[]::uuid[];
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_option_values (option_group_id, value, sort_order) VALUES (og_id, sizes[i], i - 1) RETURNING id INTO ov_id;
    ov_ids := ov_ids || ov_id;
  END LOOP;
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_variants (product_id, option_values, sku, stock_quantity)
    VALUES (p_id, jsonb_build_array(jsonb_build_object('group_id', og_id, 'group_name', 'Size', 'value_id', ov_ids[i], 'value', sizes[i])), null, d32_sl_stock[i]);
  END LOOP;

  -- ── 4. D28 H11-M11 Top Hat Single Layer Nozzle ──
  SELECT id INTO p_id FROM products WHERE name = 'D28 H11-M11 Top Hat Single Layer Nozzle' LIMIT 1;
  INSERT INTO product_option_groups (product_id, name, sort_order) VALUES (p_id, 'Size', 0) RETURNING id INTO og_id;
  ov_ids := ARRAY[]::uuid[];
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_option_values (option_group_id, value, sort_order) VALUES (og_id, sizes[i], i - 1) RETURNING id INTO ov_id;
    ov_ids := ov_ids || ov_id;
  END LOOP;
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_variants (product_id, option_values, sku, stock_quantity)
    VALUES (p_id, jsonb_build_array(jsonb_build_object('group_id', og_id, 'group_name', 'Size', 'value_id', ov_ids[i], 'value', sizes[i])), null, d28_th_stock[i]);
  END LOOP;

  -- ── 5. D28 H15-M11 Double Layer Nozzle ──
  SELECT id INTO p_id FROM products WHERE name = 'D28 H15-M11 Double Layer Nozzle' LIMIT 1;
  INSERT INTO product_option_groups (product_id, name, sort_order) VALUES (p_id, 'Size', 0) RETURNING id INTO og_id;
  ov_ids := ARRAY[]::uuid[];
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_option_values (option_group_id, value, sort_order) VALUES (og_id, sizes[i], i - 1) RETURNING id INTO ov_id;
    ov_ids := ov_ids || ov_id;
  END LOOP;
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_variants (product_id, option_values, sku, stock_quantity)
    VALUES (p_id, jsonb_build_array(jsonb_build_object('group_id', og_id, 'group_name', 'Size', 'value_id', ov_ids[i], 'value', sizes[i])), null, d28_h15_dl_stock[i]);
  END LOOP;

  -- ── 6. D28 H15-M11 Single Layer Nozzle ──
  SELECT id INTO p_id FROM products WHERE name = 'D28 H15-M11 Single Layer Nozzle' LIMIT 1;
  INSERT INTO product_option_groups (product_id, name, sort_order) VALUES (p_id, 'Size', 0) RETURNING id INTO og_id;
  ov_ids := ARRAY[]::uuid[];
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_option_values (option_group_id, value, sort_order) VALUES (og_id, sizes[i], i - 1) RETURNING id INTO ov_id;
    ov_ids := ov_ids || ov_id;
  END LOOP;
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_variants (product_id, option_values, sku, stock_quantity)
    VALUES (p_id, jsonb_build_array(jsonb_build_object('group_id', og_id, 'group_name', 'Size', 'value_id', ov_ids[i], 'value', sizes[i])), null, d28_h15_sl_stock[i]);
  END LOOP;

  -- ── 7. D15 H19-M8 3D Double Layer Nozzle ──
  SELECT id INTO p_id FROM products WHERE name = 'D15 H19-M8 3D Double Layer Nozzle' LIMIT 1;
  INSERT INTO product_option_groups (product_id, name, sort_order) VALUES (p_id, 'Size', 0) RETURNING id INTO og_id;
  ov_ids := ARRAY[]::uuid[];
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_option_values (option_group_id, value, sort_order) VALUES (og_id, sizes[i], i - 1) RETURNING id INTO ov_id;
    ov_ids := ov_ids || ov_id;
  END LOOP;
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_variants (product_id, option_values, sku, stock_quantity)
    VALUES (p_id, jsonb_build_array(jsonb_build_object('group_id', og_id, 'group_name', 'Size', 'value_id', ov_ids[i], 'value', sizes[i])), null, d15_3d_dl_stock[i]);
  END LOOP;

  -- ── 8. D15 H19-M8 3D Single Layer Nozzle ──
  SELECT id INTO p_id FROM products WHERE name = 'D15 H19-M8 3D Single Layer Nozzle' LIMIT 1;
  INSERT INTO product_option_groups (product_id, name, sort_order) VALUES (p_id, 'Size', 0) RETURNING id INTO og_id;
  ov_ids := ARRAY[]::uuid[];
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_option_values (option_group_id, value, sort_order) VALUES (og_id, sizes[i], i - 1) RETURNING id INTO ov_id;
    ov_ids := ov_ids || ov_id;
  END LOOP;
  FOR i IN 1..array_length(sizes, 1) LOOP
    INSERT INTO product_variants (product_id, option_values, sku, stock_quantity)
    VALUES (p_id, jsonb_build_array(jsonb_build_object('group_id', og_id, 'group_name', 'Size', 'value_id', ov_ids[i], 'value', sizes[i])), null, d15_3d_sl_stock[i]);
  END LOOP;

END $$;

-- ─── Done! ──────────────────────────────────────────────────
-- You should now have:
--   16 rows in products
--   8 rows in product_option_groups (one "Size" group per nozzle product)
--   104 rows in product_option_values (13 sizes × 8 products)
--   104 rows in product_variants (13 variants × 8 products)
-- Total inventory items (products without variants + variants): 8 + 104 = 112
