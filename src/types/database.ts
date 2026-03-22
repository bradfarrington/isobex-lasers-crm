// Statuses are now dynamic (managed from Settings)
export type CompanyStatus = string;
export type LeadStatus = string;
export type ContactType = 'Customer' | 'Lead';

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  notes: string | null;
  status: CompanyStatus;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  notes: string | null;
  contact_type: ContactType;
  source: string | null;
  message: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  // Joined from companies table
  company?: Company | null;
}

// Configurable lookup item (used for lead_sources, lead_statuses, company_statuses)
export interface LookupItem {
  id: string;
  name: string;
  color?: string;
  sort_order: number;
  created_at: string;
}

export type LookupInsert = {
  name: string;
  color?: string;
  sort_order?: number;
};

// For creating/updating — omit auto-generated fields
export type ContactInsert = Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'company'>;
export type ContactUpdate = Partial<ContactInsert>;

export type CompanyInsert = Omit<Company, 'id' | 'created_at' | 'updated_at'>;
export type CompanyUpdate = Partial<CompanyInsert>;

// ─── Contact Documents ──────────────────────────────────
export interface ContactDocument {
  id: string;
  contact_id: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  file_type: string | null;
  folders: string[];
  created_at: string;
  updated_at: string;
}

export type ContactDocumentInsert = Omit<ContactDocument, 'id' | 'created_at' | 'updated_at'>;
export type ContactDocumentUpdate = Partial<Pick<ContactDocument, 'file_name' | 'folders'>>;

// ─── Document Folders (global) ──────────────────────────
export interface DocumentFolder {
  id: string;
  folder_name: string;
  created_at: string;
}

// ─── Pipelines ──────────────────────────────────────────
export interface Pipeline {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export type PipelineInsert = { name: string };
export type PipelineUpdate = Partial<PipelineInsert>;

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export type PipelineStageInsert = Omit<PipelineStage, 'id' | 'created_at'>;
export type PipelineStageUpdate = Partial<Omit<PipelineStageInsert, 'pipeline_id'>>;

export interface PipelineDeal {
  id: string;
  stage_id: string;
  contact_id: string;
  field_data: Record<string, any>;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined
  contact?: Contact | null;
  stage?: PipelineStage | null;
  pipeline?: Pipeline | null;
}

export type PipelineDealInsert = {
  stage_id: string;
  contact_id: string;
  field_data?: Record<string, any>;
  sort_order?: number;
};
export type PipelineDealUpdate = Partial<Pick<PipelineDeal, 'stage_id' | 'sort_order' | 'field_data'>>;

// ─── Pipeline Card Fields (configurable) ────────────────
export interface PipelineCardField {
  id: string;
  key: string;
  label: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  field_options: Record<string, any> | null;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface PipelineFieldConfig {
  id: string;
  pipeline_id: string;
  field_id: string;
  enabled: boolean;
  sort_order: number;
  // Joined
  field?: PipelineCardField | null;
}

// ─── Online Store: Products ─────────────────────────────────

export type ProductType = 'physical' | 'digital';

export interface Product {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  product_type: ProductType;
  price: number;
  compare_at_price: number | null;
  sku: string | null;
  is_visible: boolean;
  stock_quantity: number;
  min_stock_threshold: number;
  pack_quantity: number;
  weight_kg: number;
  continue_selling_when_out_of_stock: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  labels?: LookupItem[];
  collections?: Collection[];
  media?: ProductMedia[];
  variants?: ProductVariant[];
  // Computed (product list)
  variant_count?: number;
  total_variant_stock?: number;
  variant_stock_details?: { label: string; stock: number }[];
  variant_price_min?: number | null;
  variant_price_max?: number | null;
}

export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'labels' | 'collections' | 'media' | 'variants'>;
export type ProductUpdate = Partial<Omit<ProductInsert, 'product_type'>>;

// ─── Online Store: Collections ──────────────────────────────

export interface Collection {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  cover_image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Virtual (computed from assignments)
  product_count?: number;
}

export type CollectionInsert = Omit<Collection, 'id' | 'created_at' | 'updated_at' | 'product_count'>;
export type CollectionUpdate = Partial<CollectionInsert>;

// ─── Online Store: Product Media ────────────────────────────

export type MediaType = 'image' | 'video' | 'document';

export interface ProductMedia {
  id: string;
  product_id: string;
  media_url: string;
  media_type: MediaType;
  file_name: string | null;
  sort_order: number;
  created_at: string;
}

export type ProductMediaInsert = Omit<ProductMedia, 'id' | 'created_at'>;

// ─── Online Store: Product Options ──────────────────────────

export interface ProductOptionGroup {
  id: string;
  product_id: string;
  name: string;
  sort_order: number;
  values?: ProductOptionValue[];
}

export interface ProductOptionValue {
  id: string;
  option_group_id: string;
  value: string;
  sort_order: number;
}

// ─── Online Store: Product Variants ─────────────────────────

export interface VariantOptionEntry {
  group_id: string;
  group_name: string;
  value_id: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  option_values: VariantOptionEntry[];
  price_override: number | null;
  compare_at_price: number | null;
  sku: string | null;
  stock_quantity: number;
  created_at: string;
}

export type ProductVariantInsert = Omit<ProductVariant, 'id' | 'created_at'>;

// ─── Online Store: Inventory Summary (virtual) ──────────────

export interface InventoryItem {
  product_id: string;
  product_name: string;
  product_sku: string | null;
  variant_id: string | null;
  variant_label: string | null;
  variant_sku: string | null;
  stock_quantity: number;
  min_stock_threshold: number;
  continue_selling_when_out_of_stock: boolean;
  price: number;
}

// ─── Store Config ───────────────────────────────────────────

export interface StoreConfig {
  id: string;
  store_name: string;
  tagline: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  // Colours
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  color_background: string;
  color_surface: string;
  color_text: string;
  color_text_secondary: string;
  // Typography
  font_heading: string;
  font_body: string;
  // Header
  announcement_bar_text: string | null;
  announcement_bar_active: boolean;
  header_layout: {
    logo_position: 'left' | 'center';
    nav_links: { label: string; url: string }[];
  };
  // Footer
  footer_config: {
    columns: { title: string; links: { label: string; url: string }[] }[];
    social_links: { platform: string; url: string }[];
    copyright: string;
  };
  // Homepage
  hero_image_url: string | null;
  hero_title: string;
  hero_subtitle: string | null;
  hero_cta_text: string;
  hero_cta_link: string;
  featured_collection_ids: string[];
  featured_product_ids: string[];
  // SEO
  seo_title: string | null;
  seo_description: string | null;
  seo_image_url: string | null;
  // Domain
  custom_domain: string | null;
  // Currency
  currency_symbol: string;
  currency_code: string;
  created_at: string;
  updated_at: string;
}

export type StoreConfigUpdate = Partial<Omit<StoreConfig, 'id' | 'created_at' | 'updated_at'>>;

// ─── Orders ─────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed';

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

export interface Order {
  id: string;
  order_number: number;
  contact_id: string | null;
  company_id: string | null;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  shipping_address: ShippingAddress | null;
  shipping_method: string | null;
  shipping_cost: number;
  subtotal: number;
  discount_amount: number;
  discount_code: string | null;
  gift_card_amount: number;
  gift_card_code: string | null;
  tax_amount: number;
  total: number;
  status: OrderStatus;
  payment_intent_id: string | null;
  payment_status: PaymentStatus;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_carrier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  items?: OrderItem[];
  contact?: Contact | null;
  company?: Company | null;
}

export type OrderInsert = Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at' | 'items' | 'contact' | 'company'>;

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_label: string | null;
  product_image_url: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_weight_kg: number;
  created_at: string;
  // Enriched from linked product (not stored in DB)
  pack_quantity?: number;
}

export type OrderItemInsert = Omit<OrderItem, 'id' | 'created_at'>;

// ─── Discount Codes ─────────────────────────────────────────

export type DiscountType = 'percentage' | 'fixed';

export interface DiscountCode {
  id: string;
  code: string;
  discount_type: DiscountType;
  value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DiscountCodeInsert = Omit<DiscountCode, 'id' | 'created_at' | 'updated_at' | 'current_uses'>;
export type DiscountCodeUpdate = Partial<DiscountCodeInsert>;

// ─── Gift Cards ─────────────────────────────────────────────

export interface GiftCard {
  id: string;
  code: string;
  initial_balance: number;
  current_balance: number;
  purchaser_email: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  message: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type GiftCardInsert = Omit<GiftCard, 'id' | 'created_at' | 'updated_at'>;
export type GiftCardUpdate = Partial<GiftCardInsert>;

// ─── Shipping ───────────────────────────────────────────────

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  is_default: boolean;
  created_at: string;
  // Joined
  rates?: ShippingRate[];
}

export type ShippingZoneInsert = Omit<ShippingZone, 'id' | 'created_at' | 'rates'>;
export type ShippingZoneUpdate = Partial<ShippingZoneInsert>;

export interface ShippingRate {
  id: string;
  zone_id: string;
  name: string;
  min_weight_kg: number;
  max_weight_kg: number;
  price: number;
  estimated_days_min: number;
  estimated_days_max: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type ShippingRateInsert = Omit<ShippingRate, 'id' | 'created_at'>;
export type ShippingRateUpdate = Partial<ShippingRateInsert>;

// ─── Page SEO ───────────────────────────────────────────────

export interface PageSeo {
  id: string;
  page_key: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export type PageSeoInsert = Omit<PageSeo, 'id' | 'created_at' | 'updated_at'>;
export type PageSeoUpdate = Partial<PageSeoInsert>;

// ─── Cart (client-side only, not in DB) ─────────────────────

export interface CartItem {
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  price: number;
  compareAtPrice: number | null;
  quantity: number;
  imageUrl: string | null;
  weightKg: number;
  sku: string | null;
  slug: string;
}

// ─── Store Pages (Page Builder) ─────────────────────────────

export type BlockType =
  | 'hero'
  | 'half_hero'
  | 'heading'
  | 'text'
  | 'image'
  | 'image_gallery'
  | 'button'
  | 'product_grid'
  | 'collection_grid'
  | 'collection_showcase'
  | 'category_links'
  | 'product_carousel'
  | 'featured_product'
  | 'spacer'
  | 'divider'
  | 'video'
  | 'testimonials'
  | 'faq'
  | 'banner'
  | 'custom_html';

export interface PageBlock {
  id: string;
  type: BlockType;
  config: Record<string, any>;
}

export interface StorePage {
  id: string;
  page_key: string;
  title: string;
  blocks: PageBlock[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export type StorePageInsert = Omit<StorePage, 'id' | 'created_at' | 'updated_at'>;
export type StorePageUpdate = Partial<StorePageInsert>;

