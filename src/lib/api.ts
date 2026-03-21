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
  Product,
  ProductInsert,
  ProductUpdate,
  Collection,
  CollectionInsert,
  CollectionUpdate,
  ProductMedia,
  ProductMediaInsert,
  ProductOptionGroup,
  ProductOptionValue,
  ProductVariant,
  ProductVariantInsert,
  InventoryItem,
  StoreConfig,
  StoreConfigUpdate,
  Order,
  OrderInsert,
  OrderItem,
  OrderItemInsert,
  DiscountCode,
  DiscountCodeInsert,
  DiscountCodeUpdate,
  GiftCard,
  GiftCardInsert,
  GiftCardUpdate,
  ShippingZone,
  ShippingZoneInsert,
  ShippingZoneUpdate,
  ShippingRate,
  ShippingRateInsert,
  ShippingRateUpdate,
  PageSeo,
  PageSeoUpdate,
  StorePage,
  StorePageUpdate,
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

type LookupTable = 'lead_sources' | 'lead_statuses' | 'company_statuses' | 'product_labels';

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

// ─── Online Store: Products ─────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  const products = data as Product[];

  // Fetch all variants in one query to compute stock and price aggregates
  const { data: variants, error: vErr } = await supabase
    .from('product_variants')
    .select('product_id, option_values, stock_quantity, price_override');

  if (vErr) throw vErr;

  // Group variants by product_id
  const variantsByProduct = new Map<string, any[]>();
  (variants || []).forEach((v: any) => {
    const list = variantsByProduct.get(v.product_id) || [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  });

  // Attach variant stock + price metadata to each product
  return products.map((p) => {
    const pvariants = variantsByProduct.get(p.id);
    if (pvariants && pvariants.length > 0) {
      const details = pvariants.map((v: any) => ({
        label: (v.option_values || []).map((ov: any) => ov.value).join(' / ') || 'Default',
        stock: v.stock_quantity ?? 0,
      }));
      const total = details.reduce((sum: number, d: { stock: number }) => sum + d.stock, 0);

      // Compute variant price range
      const prices = pvariants
        .map((v: any) => v.price_override as number | null)
        .filter((p): p is number => p != null && p > 0);
      const priceMin = prices.length > 0 ? Math.min(...prices) : null;
      const priceMax = prices.length > 0 ? Math.max(...prices) : null;

      return {
        ...p,
        variant_count: pvariants.length,
        total_variant_stock: total,
        variant_stock_details: details,
        variant_price_min: priceMin,
        variant_price_max: priceMax,
      };
    }
    return p;
  });
}

export async function fetchProduct(productId: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) throw error;
  return data as Product;
}

export async function createProduct(product: ProductInsert): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, updates: ProductUpdate): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

// ─── Online Store: Product Media ────────────────────────────

export async function fetchProductMedia(productId: string): Promise<ProductMedia[]> {
  const { data, error } = await supabase
    .from('product_media')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as ProductMedia[];
}

export async function fetchProductImages(productId: string): Promise<ProductMedia[]> {
  const { data, error } = await supabase
    .from('product_media')
    .select('*')
    .eq('product_id', productId)
    .in('media_type', ['image', 'video'])
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as ProductMedia[];
}

export async function fetchProductDocuments(productId: string): Promise<ProductMedia[]> {
  const { data, error } = await supabase
    .from('product_media')
    .select('*')
    .eq('product_id', productId)
    .eq('media_type', 'document')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as ProductMedia[];
}

export async function addProductMedia(media: ProductMediaInsert): Promise<ProductMedia> {
  const { data, error } = await supabase
    .from('product_media')
    .insert(media)
    .select()
    .single();

  if (error) throw error;
  return data as ProductMedia;
}

export async function deleteProductMedia(id: string): Promise<void> {
  const { error } = await supabase.from('product_media').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderProductMedia(
  _productId: string,
  orderedIds: string[]
): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase.from('product_media').update({ sort_order: index }).eq('id', id)
  );
  await Promise.all(updates);
}

// ─── Online Store: Product Options & Variants ───────────────

export async function fetchProductOptions(
  productId: string
): Promise<ProductOptionGroup[]> {
  const { data: groups, error: gErr } = await supabase
    .from('product_option_groups')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (gErr) throw gErr;

  const groupIds = (groups || []).map((g: ProductOptionGroup) => g.id);
  if (groupIds.length === 0) return [];

  const { data: values, error: vErr } = await supabase
    .from('product_option_values')
    .select('*')
    .in('option_group_id', groupIds)
    .order('sort_order', { ascending: true });

  if (vErr) throw vErr;

  return (groups as ProductOptionGroup[]).map((g) => ({
    ...g,
    values: (values as ProductOptionValue[]).filter((v) => v.option_group_id === g.id),
  }));
}

export async function saveProductOptions(
  productId: string,
  groups: { name: string; values: string[] }[]
): Promise<ProductOptionGroup[]> {
  await supabase.from('product_option_groups').delete().eq('product_id', productId);

  const result: ProductOptionGroup[] = [];

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    const { data: group, error: gErr } = await supabase
      .from('product_option_groups')
      .insert({ product_id: productId, name: g.name, sort_order: gi })
      .select()
      .single();

    if (gErr) throw gErr;

    const valRows = g.values.map((v, vi) => ({
      option_group_id: group.id,
      value: v,
      sort_order: vi,
    }));

    const { data: vals, error: vErr } = await supabase
      .from('product_option_values')
      .insert(valRows)
      .select();

    if (vErr) throw vErr;

    result.push({ ...group, values: vals as ProductOptionValue[] } as ProductOptionGroup);
  }

  return result;
}

export async function fetchProductVariants(
  productId: string
): Promise<ProductVariant[]> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as ProductVariant[];
}

export async function saveProductVariants(
  productId: string,
  variants: ProductVariantInsert[]
): Promise<ProductVariant[]> {
  await supabase.from('product_variants').delete().eq('product_id', productId);

  if (variants.length === 0) return [];

  const { data, error } = await supabase
    .from('product_variants')
    .insert(variants)
    .select();

  if (error) throw error;
  return data as ProductVariant[];
}

export async function updateProductVariant(
  id: string,
  updates: Partial<Pick<ProductVariant, 'price_override' | 'sku' | 'stock_quantity'>>
): Promise<ProductVariant> {
  const { data, error } = await supabase
    .from('product_variants')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ProductVariant;
}

// ─── Online Store: Collections ──────────────────────────────

export async function fetchCollections(): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const { data: counts } = await supabase
    .from('product_collection_assignments')
    .select('collection_id');

  const countMap: Record<string, number> = {};
  (counts || []).forEach((row: { collection_id: string }) => {
    countMap[row.collection_id] = (countMap[row.collection_id] || 0) + 1;
  });

  return (data as Collection[]).map((c) => ({
    ...c,
    product_count: countMap[c.id] || 0,
  }));
}

export async function createCollection(collection: CollectionInsert): Promise<Collection> {
  const { data, error } = await supabase
    .from('collections')
    .insert(collection)
    .select()
    .single();

  if (error) throw error;
  return { ...data, product_count: 0 } as Collection;
}

export async function updateCollection(
  id: string,
  updates: CollectionUpdate
): Promise<Collection> {
  const { data, error } = await supabase
    .from('collections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Collection;
}

export async function deleteCollection(id: string): Promise<void> {
  const { error } = await supabase.from('collections').delete().eq('id', id);
  if (error) throw error;
}

// ─── Online Store: Product ↔ Label assignments ──────────────

export async function fetchProductLabelIds(productId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('product_label_assignments')
    .select('label_id')
    .eq('product_id', productId);

  if (error) throw error;
  return (data || []).map((r: { label_id: string }) => r.label_id);
}

export async function assignProductLabels(
  productId: string,
  labelIds: string[]
): Promise<void> {
  await supabase
    .from('product_label_assignments')
    .delete()
    .eq('product_id', productId);

  if (labelIds.length === 0) return;

  const rows = labelIds.map((labelId) => ({ product_id: productId, label_id: labelId }));
  const { error } = await supabase.from('product_label_assignments').insert(rows);
  if (error) throw error;
}

// ─── Online Store: Product ↔ Collection assignments ─────────

export async function fetchProductCollectionIds(productId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('product_collection_assignments')
    .select('collection_id')
    .eq('product_id', productId);

  if (error) throw error;
  return (data || []).map((r: { collection_id: string }) => r.collection_id);
}

export async function assignProductCollections(
  productId: string,
  collectionIds: string[]
): Promise<void> {
  await supabase
    .from('product_collection_assignments')
    .delete()
    .eq('product_id', productId);

  if (collectionIds.length === 0) return;

  const rows = collectionIds.map((collectionId) => ({
    product_id: productId,
    collection_id: collectionId,
  }));
  const { error } = await supabase.from('product_collection_assignments').insert(rows);
  if (error) throw error;
}

// ─── Online Store: Inventory Summary ────────────────────────

export async function fetchInventorySummary(): Promise<InventoryItem[]> {
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id, name, sku, price, stock_quantity, min_stock_threshold, continue_selling_when_out_of_stock')
    .order('name', { ascending: true });

  if (pErr) throw pErr;

  const { data: variants, error: vErr } = await supabase
    .from('product_variants')
    .select('id, product_id, option_values, price_override, sku, stock_quantity');

  if (vErr) throw vErr;

  const items: InventoryItem[] = [];
  const productMap = new Map((products || []).map((p: any) => [p.id, p]));

  const variantsByProduct = new Map<string, any[]>();
  (variants || []).forEach((v: any) => {
    const list = variantsByProduct.get(v.product_id) || [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  });

  for (const [pid, product] of productMap.entries()) {
    const pvariants = variantsByProduct.get(pid);
    if (pvariants && pvariants.length > 0) {
      for (const v of pvariants) {
        const label = (v.option_values || [])
          .map((ov: any) => ov.value)
          .join(' / ');
        items.push({
          product_id: pid,
          product_name: product.name,
          product_sku: product.sku,
          variant_id: v.id,
          variant_label: label || null,
          variant_sku: v.sku,
          stock_quantity: v.stock_quantity ?? 0,
          min_stock_threshold: product.min_stock_threshold ?? 0,
          continue_selling_when_out_of_stock: product.continue_selling_when_out_of_stock ?? false,
          price: v.price_override ?? product.price ?? 0,
        });
      }
    } else {
      items.push({
        product_id: pid,
        product_name: product.name,
        product_sku: product.sku,
        variant_id: null,
        variant_label: null,
        variant_sku: null,
        stock_quantity: product.stock_quantity ?? 0,
        min_stock_threshold: product.min_stock_threshold ?? 0,
        continue_selling_when_out_of_stock: product.continue_selling_when_out_of_stock ?? false,
        price: product.price ?? 0,
      });
    }
  }

  return items;
}

// ─── Storefront: Fetch visible products for the shop ────────

export async function fetchVisibleProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_visible', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const products = data as Product[];

  // Fetch variants for price range
  const { data: variants, error: vErr } = await supabase
    .from('product_variants')
    .select('product_id, option_values, stock_quantity, price_override');
  if (vErr) throw vErr;

  const variantsByProduct = new Map<string, any[]>();
  (variants || []).forEach((v: any) => {
    const list = variantsByProduct.get(v.product_id) || [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  });

  return products.map((p) => {
    const pvariants = variantsByProduct.get(p.id);
    if (pvariants && pvariants.length > 0) {
      const prices = pvariants
        .map((v: any) => v.price_override as number | null)
        .filter((p): p is number => p != null && p > 0);
      return {
        ...p,
        variant_count: pvariants.length,
        variant_price_min: prices.length > 0 ? Math.min(...prices) : null,
        variant_price_max: prices.length > 0 ? Math.max(...prices) : null,
      };
    }
    return p;
  });
}

export async function fetchProductBySlug(slugOrId: string): Promise<Product> {
  // Try slug first
  const { data: bySlug } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slugOrId)
    .eq('is_visible', true)
    .maybeSingle();

  if (bySlug) return bySlug as Product;

  // Fall back to ID
  const { data: byId, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', slugOrId)
    .eq('is_visible', true)
    .single();

  if (error) throw error;
  return byId as Product;
}

export async function fetchCollectionBySlug(slugOrId: string): Promise<Collection> {
  // Try slug first
  const { data: bySlug } = await supabase
    .from('collections')
    .select('*')
    .eq('slug', slugOrId)
    .maybeSingle();

  if (bySlug) return bySlug as Collection;

  // Fall back to ID
  const { data: byId, error } = await supabase
    .from('collections')
    .select('*')
    .eq('id', slugOrId)
    .single();

  if (error) throw error;
  return byId as Collection;
}

export async function fetchCollectionProductsBySlugOrId(slugOrId: string): Promise<Product[]> {
  const collection = await fetchCollectionBySlug(slugOrId);
  if (!collection) return [];
  return fetchProductsByCollectionId(collection.id);
}

/**
 * Batch-fetch the first image (thumbnail) for a list of product IDs.
 * Returns a map of productId -> media_url.
 */
export async function fetchProductThumbnails(productIds: string[]): Promise<Record<string, string>> {
  if (productIds.length === 0) return {};

  const { data, error } = await supabase
    .from('product_media')
    .select('product_id, media_url, sort_order')
    .in('product_id', productIds)
    .in('media_type', ['image', 'video'])
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const result: Record<string, string> = {};
  (data || []).forEach((m: any) => {
    // Only keep the first image per product
    if (!result[m.product_id]) {
      result[m.product_id] = m.media_url;
    }
  });
  return result;
}

export async function fetchProductsByCollectionId(collectionId: string): Promise<Product[]> {
  const { data: assignments, error: aErr } = await supabase
    .from('product_collection_assignments')
    .select('product_id')
    .eq('collection_id', collectionId);

  if (aErr) throw aErr;
  const ids = (assignments || []).map((a: { product_id: string }) => a.product_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('id', ids)
    .eq('is_visible', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Product[];
}

// ─── Store Config ───────────────────────────────────────────

export async function fetchStoreConfig(): Promise<StoreConfig> {
  const { data, error } = await supabase
    .from('store_config')
    .select('*')
    .limit(1)
    .single();

  if (error) throw error;
  return data as StoreConfig;
}

export async function updateStoreConfig(updates: StoreConfigUpdate): Promise<StoreConfig> {
  // Get existing config id first
  const config = await fetchStoreConfig();
  const { data, error } = await supabase
    .from('store_config')
    .update(updates)
    .eq('id', config.id)
    .select()
    .single();

  if (error) throw error;
  return data as StoreConfig;
}

// ─── Orders ─────────────────────────────────────────────────

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Order[];
}

export async function fetchOrder(id: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Order;
}

export async function fetchOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as OrderItem[];
}

export async function fetchOrdersByContact(contactId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Order[];
}

export async function createOrder(order: OrderInsert): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();

  if (error) throw error;
  return data as Order;
}

export async function createOrderItems(items: OrderItemInsert[]): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from('order_items')
    .insert(items)
    .select();

  if (error) throw error;
  return data as OrderItem[];
}

export async function updateOrderStatus(
  id: string,
  status: Order['status'],
  paymentStatus?: Order['payment_status']
): Promise<Order> {
  const updates: Record<string, any> = { status };
  if (paymentStatus !== undefined) updates.payment_status = paymentStatus;

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Order;
}

// ─── Discount Codes ─────────────────────────────────────────

export async function fetchDiscountCodes(): Promise<DiscountCode[]> {
  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as DiscountCode[];
}

export async function createDiscountCode(code: DiscountCodeInsert): Promise<DiscountCode> {
  const { data, error } = await supabase
    .from('discount_codes')
    .insert(code)
    .select()
    .single();

  if (error) throw error;
  return data as DiscountCode;
}

export async function updateDiscountCode(id: string, updates: DiscountCodeUpdate): Promise<DiscountCode> {
  const { data, error } = await supabase
    .from('discount_codes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as DiscountCode;
}

export async function deleteDiscountCode(id: string): Promise<void> {
  const { error } = await supabase.from('discount_codes').delete().eq('id', id);
  if (error) throw error;
}

export async function validateDiscountCode(code: string, orderTotal: number): Promise<DiscountCode | null> {
  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  const dc = data as DiscountCode;

  // Check expiry
  if (dc.expires_at && new Date(dc.expires_at) < new Date()) return null;
  // Check start date
  if (dc.starts_at && new Date(dc.starts_at) > new Date()) return null;
  // Check usage limit
  if (dc.max_uses !== null && dc.current_uses >= dc.max_uses) return null;
  // Check min order
  if (orderTotal < dc.min_order_amount) return null;

  return dc;
}

export async function incrementDiscountCodeUsage(id: string): Promise<void> {
  const { data } = await supabase
    .from('discount_codes')
    .select('current_uses')
    .eq('id', id)
    .single();

  if (data) {
    await supabase
      .from('discount_codes')
      .update({ current_uses: (data.current_uses || 0) + 1 })
      .eq('id', id);
  }
}

// ─── Gift Cards ─────────────────────────────────────────────

export async function fetchGiftCards(): Promise<GiftCard[]> {
  const { data, error } = await supabase
    .from('gift_cards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as GiftCard[];
}

export async function createGiftCard(card: GiftCardInsert): Promise<GiftCard> {
  const { data, error } = await supabase
    .from('gift_cards')
    .insert(card)
    .select()
    .single();

  if (error) throw error;
  return data as GiftCard;
}

export async function updateGiftCard(id: string, updates: GiftCardUpdate): Promise<GiftCard> {
  const { data, error } = await supabase
    .from('gift_cards')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as GiftCard;
}

export async function deleteGiftCard(id: string): Promise<void> {
  const { error } = await supabase.from('gift_cards').delete().eq('id', id);
  if (error) throw error;
}

export async function validateGiftCard(code: string): Promise<GiftCard | null> {
  const { data, error } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  const gc = data as GiftCard;

  if (gc.expires_at && new Date(gc.expires_at) < new Date()) return null;
  if (gc.current_balance <= 0) return null;

  return gc;
}

export async function deductGiftCardBalance(id: string, amount: number): Promise<void> {
  const { data } = await supabase
    .from('gift_cards')
    .select('current_balance')
    .eq('id', id)
    .single();

  if (data) {
    const newBalance = Math.max(0, (data.current_balance || 0) - amount);
    await supabase
      .from('gift_cards')
      .update({ current_balance: newBalance })
      .eq('id', id);
  }
}

// ─── Shipping Zones & Rates ─────────────────────────────────

export async function fetchShippingZones(): Promise<ShippingZone[]> {
  const { data, error } = await supabase
    .from('shipping_zones')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as ShippingZone[];
}

export async function createShippingZone(zone: ShippingZoneInsert): Promise<ShippingZone> {
  const { data, error } = await supabase
    .from('shipping_zones')
    .insert(zone)
    .select()
    .single();

  if (error) throw error;
  return data as ShippingZone;
}

export async function updateShippingZone(id: string, updates: ShippingZoneUpdate): Promise<ShippingZone> {
  const { data, error } = await supabase
    .from('shipping_zones')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ShippingZone;
}

export async function deleteShippingZone(id: string): Promise<void> {
  const { error } = await supabase.from('shipping_zones').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchShippingRates(zoneId?: string): Promise<ShippingRate[]> {
  let query = supabase
    .from('shipping_rates')
    .select('*')
    .order('sort_order', { ascending: true });

  if (zoneId) query = query.eq('zone_id', zoneId);

  const { data, error } = await query;
  if (error) throw error;
  return data as ShippingRate[];
}

export async function createShippingRate(rate: ShippingRateInsert): Promise<ShippingRate> {
  const { data, error } = await supabase
    .from('shipping_rates')
    .insert(rate)
    .select()
    .single();

  if (error) throw error;
  return data as ShippingRate;
}

export async function updateShippingRate(id: string, updates: ShippingRateUpdate): Promise<ShippingRate> {
  const { data, error } = await supabase
    .from('shipping_rates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ShippingRate;
}

export async function deleteShippingRate(id: string): Promise<void> {
  const { error } = await supabase.from('shipping_rates').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchShippingRatesForWeight(weightKg: number): Promise<ShippingRate[]> {
  const { data, error } = await supabase
    .from('shipping_rates')
    .select('*')
    .eq('is_active', true)
    .lte('min_weight_kg', weightKg)
    .gte('max_weight_kg', weightKg)
    .order('price', { ascending: true });

  if (error) throw error;
  return data as ShippingRate[];
}

// ─── Page SEO ───────────────────────────────────────────────

export async function fetchPageSeo(pageKey: string): Promise<PageSeo | null> {
  const { data, error } = await supabase
    .from('page_seo')
    .select('*')
    .eq('page_key', pageKey)
    .single();

  if (error) return null;
  return data as PageSeo;
}

export async function fetchAllPageSeo(): Promise<PageSeo[]> {
  const { data, error } = await supabase
    .from('page_seo')
    .select('*')
    .order('page_key', { ascending: true });

  if (error) throw error;
  return data as PageSeo[];
}

export async function upsertPageSeo(pageKey: string, updates: PageSeoUpdate): Promise<PageSeo> {
  // Try update first
  const existing = await fetchPageSeo(pageKey);
  if (existing) {
    const { data, error } = await supabase
      .from('page_seo')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as PageSeo;
  }

  // Insert
  const { data, error } = await supabase
    .from('page_seo')
    .insert({ page_key: pageKey, ...updates })
    .select()
    .single();
  if (error) throw error;
  return data as PageSeo;
}

// ─── Slug Helper ────────────────────────────────────────────

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Contact lookup/creation for orders ─────────────────────

export async function findOrCreateContact(
  email: string,
  name: string,
  phone?: string
): Promise<Contact> {
  // Try to find existing contact by email
  const { data: existing } = await supabase
    .from('contacts')
    .select('*, company:companies(*)')
    .eq('email', email)
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0] as Contact;
  }

  // Create new contact
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const newContact = await createContact({
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phone || null,
    company_id: null,
    notes: null,
    contact_type: 'Customer',
    source: 'Online Store',
    message: null,
    status: null,
  });

  return newContact;
}

// ─── Store Pages (Page Builder) ──────────────────────────────

export async function fetchStorePages(): Promise<StorePage[]> {
  const { data, error } = await supabase
    .from('store_pages')
    .select('*')
    .order('page_key', { ascending: true });

  if (error) throw error;
  return data as StorePage[];
}

export async function fetchStorePage(pageKey: string): Promise<StorePage> {
  const { data, error } = await supabase
    .from('store_pages')
    .select('*')
    .eq('page_key', pageKey)
    .single();

  if (error) throw error;
  return data as StorePage;
}

export async function updateStorePage(id: string, updates: StorePageUpdate): Promise<StorePage> {
  const { data, error } = await supabase
    .from('store_pages')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as StorePage;
}

