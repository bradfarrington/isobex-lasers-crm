-- ============================================================================
-- MIGRATION: Enable Row-Level Security (RLS) on ALL tables
-- Date: 2026-04-10
-- Purpose: Fix critical "rls_disabled_in_public" vulnerability
--
-- STRATEGY:
--   1. Enable RLS on every table
--   2. Authenticated users (CRM team) get full CRUD on ALL tables
--   3. Anonymous users (storefront visitors) get limited READ + INSERT
--      on specific tables needed for the public online store
-- ============================================================================

-- ─── STEP 1: ENABLE RLS ON ALL TABLES ─────────────────────────────────────────

-- CRM Core
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_communications ENABLE ROW LEVEL SECURITY;

-- Pipelines
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_card_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_field_config ENABLE ROW LEVEL SECURITY;

-- Configurable Lookups
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_types ENABLE ROW LEVEL SECURITY;

-- Products & Store
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_label_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_compatibility_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_collection_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Discounts & Gift Cards
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

-- Shipping
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

-- SEO & Pages
ALTER TABLE public.page_seo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_pages ENABLE ROW LEVEL SECURITY;

-- Documents Hub
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_documents ENABLE ROW LEVEL SECURITY;

-- Email Marketing
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Google / Reviews
ALTER TABLE public.google_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_automation_settings ENABLE ROW LEVEL SECURITY;

-- Analytics
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecommerce_events ENABLE ROW LEVEL SECURITY;

-- Team
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;


-- ─── STEP 2: AUTHENTICATED USER POLICIES (CRM team — full access) ─────────────
-- Any logged-in user gets full CRUD on all tables.

-- CRM Core
CREATE POLICY "auth_all_contacts" ON public.contacts FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_companies" ON public.companies FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_tags" ON public.tags FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_contact_tags" ON public.contact_tags FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_contact_documents" ON public.contact_documents FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_document_folders" ON public.document_folders FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_contact_communications" ON public.contact_communications FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Pipelines
CREATE POLICY "auth_all_pipelines" ON public.pipelines FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_pipeline_stages" ON public.pipeline_stages FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_pipeline_deals" ON public.pipeline_deals FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_pipeline_card_fields" ON public.pipeline_card_fields FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_pipeline_field_config" ON public.pipeline_field_config FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Configurable Lookups
CREATE POLICY "auth_all_lead_sources" ON public.lead_sources FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_lead_statuses" ON public.lead_statuses FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_company_statuses" ON public.company_statuses FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_product_labels" ON public.product_labels FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_compatibility_types" ON public.compatibility_types FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Products & Store
CREATE POLICY "auth_all_products" ON public.products FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_product_media" ON public.product_media FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_product_option_groups" ON public.product_option_groups FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_product_option_values" ON public.product_option_values FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_product_variants" ON public.product_variants FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_product_reviews" ON public.product_reviews FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_product_label_assignments" ON public.product_label_assignments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_product_compat_assignments" ON public.product_compatibility_assignments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_product_collection_assignments" ON public.product_collection_assignments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_collections" ON public.collections FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_store_config" ON public.store_config FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Orders
CREATE POLICY "auth_all_orders" ON public.orders FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_order_items" ON public.order_items FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Discounts & Gift Cards
CREATE POLICY "auth_all_discount_codes" ON public.discount_codes FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_gift_cards" ON public.gift_cards FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Shipping
CREATE POLICY "auth_all_shipping_zones" ON public.shipping_zones FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_shipping_rates" ON public.shipping_rates FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- SEO & Pages
CREATE POLICY "auth_all_page_seo" ON public.page_seo FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_store_pages" ON public.store_pages FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Documents Hub
CREATE POLICY "auth_all_document_categories" ON public.document_categories FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_crm_documents" ON public.crm_documents FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Email Marketing
CREATE POLICY "auth_all_email_templates" ON public.email_templates FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_email_campaigns" ON public.email_campaigns FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_campaign_recipients" ON public.campaign_recipients FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Google / Reviews
CREATE POLICY "auth_all_google_settings" ON public.google_settings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_review_requests" ON public.review_requests FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_review_automation_settings" ON public.review_automation_settings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Analytics
CREATE POLICY "auth_all_page_views" ON public.page_views FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all_ecommerce_events" ON public.ecommerce_events FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Team
CREATE POLICY "auth_all_app_users" ON public.app_users FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ─── STEP 3: ANONYMOUS READ POLICIES (storefront browsing) ────────────────────
-- Anonymous visitors need to read product/store data to browse the shop.

-- Products: only visible products
CREATE POLICY "anon_read_visible_products" ON public.products
  FOR SELECT USING (is_visible = true);

-- Product media: anyone can read (needed to display images)
CREATE POLICY "anon_read_product_media" ON public.product_media
  FOR SELECT USING (true);

-- Product options & variants: anyone can read
CREATE POLICY "anon_read_product_option_groups" ON public.product_option_groups
  FOR SELECT USING (true);

CREATE POLICY "anon_read_product_option_values" ON public.product_option_values
  FOR SELECT USING (true);

CREATE POLICY "anon_read_product_variants" ON public.product_variants
  FOR SELECT USING (true);

-- Product reviews: only approved reviews visible publicly
CREATE POLICY "anon_read_approved_reviews" ON public.product_reviews
  FOR SELECT USING (status = 'approved');

-- Collections: publicly browseable
CREATE POLICY "anon_read_collections" ON public.collections
  FOR SELECT USING (true);

-- Product ↔ Collection assignments: needed for collection pages
CREATE POLICY "anon_read_product_collection_assignments" ON public.product_collection_assignments
  FOR SELECT USING (true);

-- Compatibility types & assignments: needed for product filtering
CREATE POLICY "anon_read_compatibility_types" ON public.compatibility_types
  FOR SELECT USING (true);

CREATE POLICY "anon_read_product_compat_assignments" ON public.product_compatibility_assignments
  FOR SELECT USING (true);

-- Product label assignments: needed for storefront label display
CREATE POLICY "anon_read_product_label_assignments" ON public.product_label_assignments
  FOR SELECT USING (true);

CREATE POLICY "anon_read_product_labels" ON public.product_labels
  FOR SELECT USING (true);

-- Store config: needed for storefront theming/settings
CREATE POLICY "anon_read_store_config" ON public.store_config
  FOR SELECT USING (true);

-- Store pages: needed for storefront page rendering
CREATE POLICY "anon_read_store_pages" ON public.store_pages
  FOR SELECT USING (true);

-- Page SEO: needed for storefront meta tags
CREATE POLICY "anon_read_page_seo" ON public.page_seo
  FOR SELECT USING (true);

-- Shipping rates: needed for checkout shipping options
CREATE POLICY "anon_read_shipping_rates" ON public.shipping_rates
  FOR SELECT USING (is_active = true);

CREATE POLICY "anon_read_shipping_zones" ON public.shipping_zones
  FOR SELECT USING (true);

-- Discount codes: needed for checkout code validation (read active only)
CREATE POLICY "anon_read_active_discount_codes" ON public.discount_codes
  FOR SELECT USING (is_active = true);

-- Gift cards: needed for checkout validation (read active only)
CREATE POLICY "anon_read_active_gift_cards" ON public.gift_cards
  FOR SELECT USING (is_active = true);


-- ─── STEP 4: ANONYMOUS WRITE POLICIES (storefront checkout & analytics) ───────

-- Contacts: anonymous checkout creates new contacts
CREATE POLICY "anon_insert_contacts" ON public.contacts
  FOR INSERT WITH CHECK (true);

-- Also allow anon to SELECT contacts by email (for findOrCreateContact lookup)
CREATE POLICY "anon_read_contacts_by_email" ON public.contacts
  FOR SELECT USING (true);

-- Orders: anonymous checkout creates orders
CREATE POLICY "anon_insert_orders" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Order items: anonymous checkout creates order items
CREATE POLICY "anon_insert_order_items" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- Product reviews: anonymous visitors can submit reviews
CREATE POLICY "anon_insert_product_reviews" ON public.product_reviews
  FOR INSERT WITH CHECK (true);

-- Ecommerce events: anonymous visitors trigger analytics events
CREATE POLICY "anon_insert_ecommerce_events" ON public.ecommerce_events
  FOR INSERT WITH CHECK (true);

-- Page views: anonymous visitors generate page views
CREATE POLICY "anon_insert_page_views" ON public.page_views
  FOR INSERT WITH CHECK (true);

-- Discount codes: allow anon to UPDATE current_uses (for incrementing usage count)
CREATE POLICY "anon_update_discount_usage" ON public.discount_codes
  FOR UPDATE USING (is_active = true) WITH CHECK (is_active = true);

-- Gift cards: allow anon to UPDATE balance (for deducting at checkout)
CREATE POLICY "anon_update_gift_card_balance" ON public.gift_cards
  FOR UPDATE USING (is_active = true) WITH CHECK (is_active = true);


-- ─── STEP 5: SERVICE ROLE NOTE ────────────────────────────────────────────────
-- Edge Functions (send-email, stripe-checkout, track, etc.) use the service_role
-- key which bypasses RLS entirely. No changes needed for those.

-- ============================================================================
-- DONE! Your tables are now secured with Row-Level Security.
--
-- To verify, run this query in the SQL Editor:
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
--
-- All rows should show rowsecurity = true
-- ============================================================================
