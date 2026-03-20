import { supabase } from './supabase';
import type {
  Contact,
  ContactInsert,
  ContactUpdate,
  Company,
  CompanyInsert,
  CompanyUpdate,
  LookupItem,
  LookupInsert,
  ContactDocument,
  DocumentFolder,
  Pipeline,
  PipelineInsert,
  PipelineUpdate,
  PipelineStage,
  PipelineStageInsert,
  PipelineStageUpdate,
  PipelineDeal,
  PipelineDealInsert,
  PipelineDealUpdate,
  PipelineCardField,
  PipelineFieldConfig,
} from '@/types/database';

// ─── Contacts ────────────────────────────────────────────

export async function fetchContacts(): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, company:companies(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Contact[];
}

export async function fetchContact(id: string): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, company:companies(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Contact;
}

export async function createContact(contact: ContactInsert): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .insert(contact)
    .select('*, company:companies(*)')
    .single();

  if (error) throw error;
  return data as Contact;
}

export async function updateContact(id: string, updates: ContactUpdate): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .select('*, company:companies(*)')
    .single();

  if (error) throw error;
  return data as Contact;
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw error;
}

// ─── Companies ───────────────────────────────────────────

export async function fetchCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Company[];
}

export async function createCompany(company: CompanyInsert): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .insert(company)
    .select()
    .single();

  if (error) throw error;
  return data as Company;
}

export async function updateCompany(id: string, updates: CompanyUpdate): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Company;
}

export async function deleteCompany(id: string): Promise<void> {
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw error;
}

// ─── Dashboard Stats ────────────────────────────────────

export interface DashboardStats {
  totalContacts: number;
  totalCompanies: number;
  totalCustomers: number;
  totalLeads: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [allContacts, companies, customers, leads] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('contact_type', 'Customer'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('contact_type', 'Lead'),
  ]);

  return {
    totalContacts: allContacts.count ?? 0,
    totalCompanies: companies.count ?? 0,
    totalCustomers: customers.count ?? 0,
    totalLeads: leads.count ?? 0,
  };
}

// ─── Configurable Lookups ────────────────────────────────

type LookupTable = 'lead_sources' | 'lead_statuses' | 'company_statuses';

export async function fetchLookup(table: LookupTable): Promise<LookupItem[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as LookupItem[];
}

export async function createLookupItem(table: LookupTable, item: LookupInsert): Promise<LookupItem> {
  const { data, error } = await supabase
    .from(table)
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data as LookupItem;
}

export async function updateLookupItem(
  table: LookupTable,
  id: string,
  updates: Partial<LookupInsert>
): Promise<LookupItem> {
  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LookupItem;
}

export async function deleteLookupItem(table: LookupTable, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

// ─── Contact Documents ──────────────────────────────────

const DOCS_BUCKET = 'contact-documents';

export async function fetchContactDocuments(contactId: string): Promise<ContactDocument[]> {
  const { data, error } = await supabase
    .from('contact_documents')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ContactDocument[];
}

export async function uploadContactDocuments(
  contactId: string,
  files: File[],
  folders: string[] = ['General']
): Promise<ContactDocument[]> {
  const results: ContactDocument[] = [];

  for (const file of files) {
    // Generate unique storage path: contactId/timestamp-uuid-filename
    const uniqueId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const storagePath = `${contactId}/${uniqueId}-${file.name}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(DOCS_BUCKET)
      .upload(storagePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Create metadata row
    const { data, error: insertError } = await supabase
      .from('contact_documents')
      .insert({
        contact_id: contactId,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        file_type: file.type || null,
        folders,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    results.push(data as ContactDocument);
  }

  return results;
}

export async function renameContactDocument(
  docId: string,
  newName: string
): Promise<ContactDocument> {
  const { data, error } = await supabase
    .from('contact_documents')
    .update({ file_name: newName })
    .eq('id', docId)
    .select()
    .single();

  if (error) throw error;
  return data as ContactDocument;
}

export async function updateDocumentFolders(
  docId: string,
  folders: string[]
): Promise<ContactDocument> {
  const { data, error } = await supabase
    .from('contact_documents')
    .update({ folders })
    .eq('id', docId)
    .select()
    .single();

  if (error) throw error;
  return data as ContactDocument;
}

export async function deleteContactDocument(doc: ContactDocument): Promise<void> {
  // Remove from storage
  const { error: storageError } = await supabase.storage
    .from(DOCS_BUCKET)
    .remove([doc.storage_path]);

  if (storageError) throw storageError;

  // Remove metadata
  const { error: dbError } = await supabase
    .from('contact_documents')
    .delete()
    .eq('id', doc.id);

  if (dbError) throw dbError;
}

export function getDocumentPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(DOCS_BUCKET).getPublicUrl(storagePath);
  return data?.publicUrl || '';
}

// ─── Document Folders (global) ──────────────────────────

export async function fetchDocumentFolders(): Promise<DocumentFolder[]> {
  const { data, error } = await supabase
    .from('document_folders')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as DocumentFolder[];
}

export async function createDocumentFolder(folderName: string): Promise<DocumentFolder> {
  const { data, error } = await supabase
    .from('document_folders')
    .insert({ folder_name: folderName })
    .select()
    .single();

  if (error) throw error;
  return data as DocumentFolder;
}

export async function deleteDocumentFolder(folderId: string): Promise<void> {
  const { error } = await supabase
    .from('document_folders')
    .delete()
    .eq('id', folderId);

  if (error) throw error;
}

// ─── Lead Conversion ────────────────────────────────────

export async function convertLeadToCustomer(contactId: string): Promise<Contact> {
  return updateContact(contactId, { contact_type: 'Customer' });
}

// ─── Pipelines ──────────────────────────────────────────

export async function fetchPipelines(): Promise<Pipeline[]> {
  const { data, error } = await supabase
    .from('pipelines')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Pipeline[];
}

export async function createPipeline(pipeline: PipelineInsert): Promise<Pipeline> {
  const { data, error } = await supabase
    .from('pipelines')
    .insert(pipeline)
    .select()
    .single();

  if (error) throw error;
  return data as Pipeline;
}

export async function updatePipeline(id: string, updates: PipelineUpdate): Promise<Pipeline> {
  const { data, error } = await supabase
    .from('pipelines')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Pipeline;
}

export async function deletePipeline(id: string): Promise<void> {
  const { error } = await supabase.from('pipelines').delete().eq('id', id);
  if (error) throw error;
}

// ─── Pipeline Stages ────────────────────────────────────

export async function fetchPipelineStages(pipelineId: string): Promise<PipelineStage[]> {
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as PipelineStage[];
}

export async function createPipelineStage(stage: PipelineStageInsert): Promise<PipelineStage> {
  const { data, error } = await supabase
    .from('pipeline_stages')
    .insert(stage)
    .select()
    .single();

  if (error) throw error;
  return data as PipelineStage;
}

export async function updatePipelineStage(
  id: string,
  updates: PipelineStageUpdate
): Promise<PipelineStage> {
  const { data, error } = await supabase
    .from('pipeline_stages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PipelineStage;
}

export async function deletePipelineStage(id: string): Promise<void> {
  const { error } = await supabase.from('pipeline_stages').delete().eq('id', id);
  if (error) throw error;
}

// ─── Pipeline Deals ─────────────────────────────────────

export async function fetchPipelineDeals(stageIds: string[]): Promise<PipelineDeal[]> {
  if (stageIds.length === 0) return [];
  const { data, error } = await supabase
    .from('pipeline_deals')
    .select('*, contact:contacts(id, first_name, last_name, company:companies(id, name))')
    .in('stage_id', stageIds)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as PipelineDeal[];
}

export async function createPipelineDeal(deal: PipelineDealInsert): Promise<PipelineDeal> {
  const { data, error } = await supabase
    .from('pipeline_deals')
    .insert(deal)
    .select('*, contact:contacts(id, first_name, last_name, company:companies(id, name))')
    .single();

  if (error) throw error;
  return data as PipelineDeal;
}

export async function updatePipelineDeal(
  id: string,
  updates: PipelineDealUpdate
): Promise<PipelineDeal> {
  const { data, error } = await supabase
    .from('pipeline_deals')
    .update(updates)
    .eq('id', id)
    .select('*, contact:contacts(id, first_name, last_name, company:companies(id, name))')
    .single();

  if (error) throw error;
  return data as PipelineDeal;
}

export async function deletePipelineDeal(id: string): Promise<void> {
  const { error } = await supabase.from('pipeline_deals').delete().eq('id', id);
  if (error) throw error;
}

// ─── Pipeline Card Fields (configurable) ────────────────

export async function fetchPipelineCardFields(): Promise<PipelineCardField[]> {
  const { data, error } = await supabase
    .from('pipeline_card_fields')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as PipelineCardField[];
}

export async function fetchPipelineFieldConfig(
  pipelineId: string
): Promise<PipelineFieldConfig[]> {
  const { data, error } = await supabase
    .from('pipeline_field_config')
    .select('*, field:pipeline_card_fields(*)')
    .eq('pipeline_id', pipelineId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as PipelineFieldConfig[];
}

export async function createPipelineFieldConfigs(
  pipelineId: string,
  fieldSelections: { field_id: string; enabled: boolean; sort_order: number }[]
): Promise<PipelineFieldConfig[]> {
  const rows = fieldSelections.map((fs) => ({
    pipeline_id: pipelineId,
    field_id: fs.field_id,
    enabled: fs.enabled,
    sort_order: fs.sort_order,
  }));

  const { data, error } = await supabase
    .from('pipeline_field_config')
    .insert(rows)
    .select('*, field:pipeline_card_fields(*)');

  if (error) throw error;
  return data as PipelineFieldConfig[];
}

export async function updatePipelineFieldConfig(
  pipelineId: string,
  fieldId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('pipeline_field_config')
    .update({ enabled })
    .eq('pipeline_id', pipelineId)
    .eq('field_id', fieldId);

  if (error) throw error;
}

// ─── Pipeline Deals by Contact ──────────────────────────

export async function fetchPipelineDealsByContact(
  contactId: string
): Promise<PipelineDeal[]> {
  const { data, error } = await supabase
    .from('pipeline_deals')
    .select(`
      *,
      contact:contacts(id, first_name, last_name, company:companies(id, name)),
      stage:pipeline_stages(id, name, color, pipeline_id,
        pipeline:pipelines(id, name)
      )
    `)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PipelineDeal[];
}
