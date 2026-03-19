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
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined
  contact?: Contact | null;
}

export type PipelineDealInsert = {
  stage_id: string;
  contact_id: string;
  sort_order?: number;
};
export type PipelineDealUpdate = Partial<Pick<PipelineDeal, 'stage_id' | 'sort_order'>>;
