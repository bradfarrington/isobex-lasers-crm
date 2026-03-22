-- ─── Compatibility Types (lookup table) ──────────────────────
CREATE TABLE IF NOT EXISTS compatibility_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE compatibility_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on compatibility_types" ON compatibility_types FOR ALL USING (true) WITH CHECK (true);

-- ─── Product ↔ Compatibility Type assignments ───────────────
CREATE TABLE IF NOT EXISTS product_compatibility_assignments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  compatibility_type_id uuid NOT NULL REFERENCES compatibility_types(id) ON DELETE CASCADE,
  UNIQUE (product_id, compatibility_type_id)
);

ALTER TABLE product_compatibility_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on product_compatibility_assignments" ON product_compatibility_assignments FOR ALL USING (true) WITH CHECK (true);

-- ─── Migrate existing data from collections ─────────────────
-- Insert compatibility types from collection names that end with " Parts"
INSERT INTO compatibility_types (name, sort_order)
SELECT
  REPLACE(c.name, ' Parts', ''),
  ROW_NUMBER() OVER (ORDER BY c.sort_order) - 1
FROM collections c
WHERE c.name LIKE '% Parts'
ON CONFLICT (name) DO NOTHING;

-- Auto-assign products to compatibility types based on their current collection memberships
INSERT INTO product_compatibility_assignments (product_id, compatibility_type_id)
SELECT
  pca.product_id,
  ct.id
FROM product_collection_assignments pca
JOIN collections c ON c.id = pca.collection_id
JOIN compatibility_types ct ON ct.name = REPLACE(c.name, ' Parts', '')
WHERE c.name LIKE '% Parts'
ON CONFLICT (product_id, compatibility_type_id) DO NOTHING;
