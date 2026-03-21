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
  description: string | null;
  product_type: ProductType;
  price: number;
  compare_at_price: number | null;
  sku: string | null;
  is_visible: boolean;
  stock_quantity: number;
  min_stock_threshold: number;
  pack_quantity: number;
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
