import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { useData } from '@/context/DataContext';
import { useAlert } from '@/components/ui/AlertDialog';
import * as api from '@/lib/api';
import type {
  ProductType,
  Collection,
  ProductMedia as ProductMediaType,
  VariantOptionEntry,
} from '@/types/database';
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  X,
  Image,
  Upload,
  GripVertical,
} from 'lucide-react';
import './StorePage.css';

interface OptionGroupDraft {
  name: string;
  values: string[];
}

interface VariantDraft {
  option_values: VariantOptionEntry[];
  price_override: string;
  sku: string;
  stock_quantity: string;
}

export function ProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useData();
  const { showAlert, showConfirm } = useAlert();
  const isNew = !id;

  // ─── Product fields ─────────────────────────
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productType, setProductType] = useState<ProductType>('physical');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [sku, setSku] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [continueSelling, setContinueSelling] = useState(false);
  const [stockQuantity, setStockQuantity] = useState('0');
  const [minStockThreshold, setMinStockThreshold] = useState('0');

  // ─── Associations ───────────────────────────
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);

  // ─── Media ──────────────────────────────────
  const [media, setMedia] = useState<ProductMediaType[]>([]);

  // ─── Options & Variants ────────────────────
  const [optionGroups, setOptionGroups] = useState<OptionGroupDraft[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [newOptionName, setNewOptionName] = useState('');

  // ─── State ──────────────────────────────────
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // ─── Load data ──────────────────────────────
  const loadProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [product, labelIds, collectionIds, mediaItems, options, existingVariants, collections] =
        await Promise.all([
          api.fetchProduct(id),
          api.fetchProductLabelIds(id),
          api.fetchProductCollectionIds(id),
          api.fetchProductMedia(id),
          api.fetchProductOptions(id),
          api.fetchProductVariants(id),
          api.fetchCollections(),
        ]);

      setName(product.name);
      setDescription(product.description || '');
      setProductType(product.product_type);
      setPrice(String(product.price));
      setCompareAtPrice(product.compare_at_price ? String(product.compare_at_price) : '');
      setSku(product.sku || '');
      setIsVisible(product.is_visible);
      setContinueSelling(product.continue_selling_when_out_of_stock ?? false);
      setStockQuantity(String(product.stock_quantity));
      setMinStockThreshold(String(product.min_stock_threshold));
      setSelectedLabelIds(labelIds);
      setSelectedCollectionIds(collectionIds);
      setAllCollections(collections);
      setMedia(mediaItems);

      // Convert options to draft format
      const drafts: OptionGroupDraft[] = options.map((g) => ({
        name: g.name,
        values: (g.values || []).map((v) => v.value),
      }));
      setOptionGroups(drafts);

      // Convert existing variants to draft format
      const varDrafts: VariantDraft[] = existingVariants.map((v) => ({
        option_values: v.option_values,
        price_override: v.price_override ? String(v.price_override) : '',
        sku: v.sku || '',
        stock_quantity: String(v.stock_quantity),
      }));
      setVariants(varDrafts);
    } catch (err) {
      console.error('Failed to load product:', err);
      showAlert({ title: 'Error', message: 'Failed to load product.', variant: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [id, showAlert]);

  useEffect(() => {
    if (isNew) {
      api.fetchCollections().then(setAllCollections).catch(console.error);
    } else {
      loadProduct();
    }
  }, [isNew, loadProduct]);

  // ─── Generate variant combinations ────────
  const generateVariants = useCallback((groups: OptionGroupDraft[]) => {
    const validGroups = groups.filter((g) => g.name.trim() && g.values.length > 0);
    if (validGroups.length === 0) {
      setVariants([]);
      return;
    }

    // Cartesian product
    const combos: VariantOptionEntry[][] = validGroups.reduce<VariantOptionEntry[][]>(
      (acc, group) => {
        const newCombos: VariantOptionEntry[][] = [];
        const groupValues = group.values.filter((v) => v.trim());
        for (const combo of acc) {
          for (const val of groupValues) {
            newCombos.push([
              ...combo,
              {
                group_id: '',
                group_name: group.name,
                value_id: '',
                value: val,
              },
            ]);
          }
        }
        return newCombos;
      },
      [[]]
    );

    // Preserve existing variant data where the combination matches
    const newVariants: VariantDraft[] = combos.map((combo) => {
      const label = combo.map((c) => `${c.group_name}:${c.value}`).join('|');
      const existing = variants.find((v) => {
        const existingLabel = v.option_values
          .map((ov) => `${ov.group_name}:${ov.value}`)
          .join('|');
        return existingLabel === label;
      });

      return existing || {
        option_values: combo,
        price_override: '',
        sku: '',
        stock_quantity: '0',
      };
    });

    setVariants(newVariants);
  }, [variants]);

  // ─── Option group handlers ────────────────
  const addOptionGroup = () => {
    if (!newOptionName.trim()) return;
    const newGroups = [...optionGroups, { name: newOptionName.trim(), values: [] }];
    setOptionGroups(newGroups);
    setNewOptionName('');
  };

  const removeOptionGroup = (index: number) => {
    const newGroups = optionGroups.filter((_, i) => i !== index);
    setOptionGroups(newGroups);
    generateVariants(newGroups);
  };

  const addOptionValue = (groupIndex: number, value: string) => {
    if (!value.trim()) return;
    const newGroups = optionGroups.map((g, i) =>
      i === groupIndex ? { ...g, values: [...g.values, value.trim()] } : g
    );
    setOptionGroups(newGroups);
    generateVariants(newGroups);
  };

  const removeOptionValue = (groupIndex: number, valueIndex: number) => {
    const newGroups = optionGroups.map((g, i) =>
      i === groupIndex
        ? { ...g, values: g.values.filter((_, vi) => vi !== valueIndex) }
        : g
    );
    setOptionGroups(newGroups);
    generateVariants(newGroups);
  };

  // ─── Variant handlers ─────────────────────
  const updateVariant = (index: number, field: keyof VariantDraft, value: string) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  // ─── Media upload ─────────────────────────
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id) return;

    for (const file of Array.from(files)) {
      try {
        const { supabase } = await import('@/lib/supabase');
        const storagePath = `products/${id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('media-storage')
          .upload(storagePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('media-storage')
          .getPublicUrl(storagePath);

        const mediaType = file.type.startsWith('video/')
          ? 'video'
          : file.type.startsWith('image/')
          ? 'image'
          : 'document';

        const newMedia = await api.addProductMedia({
          product_id: id,
          media_url: urlData.publicUrl,
          media_type: mediaType as 'image' | 'video' | 'document',
          file_name: file.name,
          sort_order: media.length,
        });

        setMedia((prev) => [...prev, newMedia]);
      } catch (err) {
        console.error('Media upload failed:', err);
      }
    }

    e.target.value = '';
  };

  const handleRemoveMedia = async (mediaId: string) => {
    try {
      await api.deleteProductMedia(mediaId);
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err) {
      console.error('Failed to remove media:', err);
    }
  };

  // ─── Save ─────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      showAlert({ title: 'Missing Name', message: 'Please enter a product name.', variant: 'warning' });
      return;
    }
    if (!price || isNaN(Number(price))) {
      showAlert({ title: 'Invalid Price', message: 'Please enter a valid price.', variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        product_type: productType,
        price: Number(price),
        compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
        sku: sku.trim() || null,
        is_visible: isVisible,
        continue_selling_when_out_of_stock: continueSelling,
        stock_quantity: Number(stockQuantity) || 0,
        min_stock_threshold: Number(minStockThreshold) || 0,
      };

      let productId = id;

      if (isNew) {
        const created = await api.createProduct(productData as any);
        productId = created.id;
      } else {
        await api.updateProduct(id!, productData);
      }

      // Save associations
      await Promise.all([
        api.assignProductLabels(productId!, selectedLabelIds),
        api.assignProductCollections(productId!, selectedCollectionIds),
      ]);

      // Save options & variants
      if (optionGroups.length > 0) {
        await api.saveProductOptions(
          productId!,
          optionGroups.filter((g) => g.name.trim() && g.values.length > 0)
        );

        const variantInserts = variants.map((v) => ({
          product_id: productId!,
          option_values: v.option_values,
          price_override: v.price_override ? Number(v.price_override) : null,
          sku: v.sku.trim() || null,
          stock_quantity: Number(v.stock_quantity) || 0,
        }));

        await api.saveProductVariants(productId!, variantInserts);
      }

      showAlert({ title: 'Saved', message: 'Product saved successfully.', variant: 'success' });
      navigate('/store');
    } catch (err) {
      console.error('Failed to save product:', err);
      showAlert({ title: 'Error', message: 'Failed to save product.', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────
  const handleDelete = async () => {
    if (!id) return;
    const ok = await showConfirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await api.deleteProduct(id);
      navigate('/store');
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  if (loading) {
    return (
      <PageShell title="Online Store" subtitle="Loading product...">
        <div className="store-loading">Loading...</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Online Store"
      subtitle={isNew ? 'Create a new product' : `Editing: ${name}`}
    >
      <div className="product-editor-header">
        <button className="btn btn-ghost" onClick={() => navigate('/store')}>
          <ArrowLeft size={16} /> Back to Products
        </button>
        <div className="product-editor-header-actions">
          {!isNew && (
            <button className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={16} /> Delete
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </div>

      <div className="product-editor-grid">
        {/* Left column — main content */}
        <div className="product-editor-main">
          {/* Basic Info */}
          <div className="editor-card">
            <h3 className="editor-card-title">Basic Information</h3>
            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fiber Laser 50W"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this product..."
                rows={4}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Product Type</label>
              <div className="radio-group">
                <label className={`radio-option ${productType === 'physical' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="productType"
                    value="physical"
                    checked={productType === 'physical'}
                    onChange={() => setProductType('physical')}
                  />
                  <span>Physical</span>
                </label>
                <label className={`radio-option ${productType === 'digital' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="productType"
                    value="digital"
                    checked={productType === 'digital'}
                    onChange={() => setProductType('digital')}
                  />
                  <span>Digital</span>
                </label>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="editor-card">
            <h3 className="editor-card-title">Pricing</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Price (£)</label>
                <input
                  type="number"
                  className="form-input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Compare at Price (£)</label>
                <input
                  type="number"
                  className="form-input"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  placeholder="Original price if on sale"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="editor-card">
            <h3 className="editor-card-title">Media</h3>
            {media.length > 0 && (
              <div className="media-gallery">
                {media.map((m, idx) => (
                  <div key={m.id} className="media-item">
                    {m.media_type === 'image' ? (
                      <img src={m.media_url} alt={m.file_name || `Image ${idx + 1}`} />
                    ) : (
                      <div className="media-file-icon">
                        <Image size={24} />
                        <span>{m.file_name || m.media_type}</span>
                      </div>
                    )}
                    <button
                      className="media-remove-btn"
                      onClick={() => handleRemoveMedia(m.id)}
                    >
                      <X size={14} />
                    </button>
                    {idx === 0 && <span className="media-hero-badge">Hero</span>}
                  </div>
                ))}
              </div>
            )}
            {!isNew ? (
              <label className="media-upload-btn">
                <Upload size={16} />
                <span>Upload Media</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleMediaUpload}
                  style={{ display: 'none' }}
                />
              </label>
            ) : (
              <p className="form-hint">Save the product first, then you can upload media.</p>
            )}
          </div>

          {/* Options & Variants */}
          <div className="editor-card">
            <h3 className="editor-card-title">Options & Variants</h3>
            <p className="form-hint">
              Add options like Size or Colour. Variant combinations will be generated automatically.
            </p>

            {/* Existing option groups */}
            {optionGroups.map((group, gi) => (
              <OptionGroupEditor
                key={gi}
                group={group}
                onAddValue={(val) => addOptionValue(gi, val)}
                onRemoveValue={(vi) => removeOptionValue(gi, vi)}
                onRemoveGroup={() => removeOptionGroup(gi)}
              />
            ))}

            {/* Add new option group */}
            <div className="option-add-row">
              <input
                type="text"
                className="form-input"
                placeholder="Option name (e.g. Size, Colour)"
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addOptionGroup();
                }}
              />
              <button
                className="btn btn-secondary"
                onClick={addOptionGroup}
                disabled={!newOptionName.trim()}
              >
                <Plus size={14} /> Add Option
              </button>
            </div>

            {/* Variant table */}
            {variants.length > 0 && (
              <div className="variants-section">
                <h4>Variants ({variants.length})</h4>
                <div className="products-table-wrap">
                  <table className="products-table variants-table">
                    <thead>
                      <tr>
                        <th>Combination</th>
                        <th>Price Override (£)</th>
                        <th>SKU</th>
                        <th>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v, vi) => (
                        <tr key={vi}>
                          <td className="variant-combo-cell">
                            <GripVertical size={14} className="grip-icon" />
                            {v.option_values.map((ov) => ov.value).join(' / ')}
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input form-input-sm"
                              value={v.price_override}
                              onChange={(e) => updateVariant(vi, 'price_override', e.target.value)}
                              placeholder={price || '—'}
                              step="0.01"
                              min="0"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-input form-input-sm"
                              value={v.sku}
                              onChange={(e) => updateVariant(vi, 'sku', e.target.value)}
                              placeholder="SKU"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input form-input-sm"
                              value={v.stock_quantity}
                              onChange={(e) => updateVariant(vi, 'stock_quantity', e.target.value)}
                              min="0"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column — sidebar */}
        <div className="product-editor-sidebar">
          {/* Visibility */}
          <div className="editor-card">
            <h3 className="editor-card-title">Visibility</h3>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => setIsVisible(e.target.checked)}
              />
              <span>Show on store</span>
            </label>
            <label className="toggle-row" style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={continueSelling}
                onChange={(e) => setContinueSelling(e.target.checked)}
              />
              <span>Continue selling when out of stock</span>
            </label>
          </div>

          {/* Inventory */}
          <div className="editor-card">
            <h3 className="editor-card-title">Inventory</h3>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input
                type="text"
                className="form-input"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Stock keeping unit"
              />
            </div>
            {variants.length === 0 && (
              <div className="form-group">
                <label className="form-label">Stock Quantity</label>
                <input
                  type="number"
                  className="form-input"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  min="0"
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Min. Stock Alert Threshold</label>
              <input
                type="number"
                className="form-input"
                value={minStockThreshold}
                onChange={(e) => setMinStockThreshold(e.target.value)}
                min="0"
              />
              <span className="form-hint">You'll be alerted when stock falls below this.</span>
            </div>
          </div>

          {/* Labels */}
          <div className="editor-card">
            <h3 className="editor-card-title">Labels</h3>
            {state.productLabels.length === 0 ? (
              <p className="form-hint">No labels yet. Add them in Settings.</p>
            ) : (
              <div className="checkbox-list">
                {state.productLabels.map((label) => (
                  <label key={label.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedLabelIds.includes(label.id)}
                      onChange={() => {
                        setSelectedLabelIds((prev) =>
                          prev.includes(label.id)
                            ? prev.filter((id) => id !== label.id)
                            : [...prev, label.id]
                        );
                      }}
                    />
                    <span
                      className="label-color-dot"
                      style={{ backgroundColor: label.color || '#6b7280' }}
                    />
                    <span>{label.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Collections */}
          <div className="editor-card">
            <h3 className="editor-card-title">Collections</h3>
            {allCollections.length === 0 ? (
              <p className="form-hint">No collections yet. Create them in the Collections tab.</p>
            ) : (
              <div className="checkbox-list">
                {allCollections.map((col) => (
                  <label key={col.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedCollectionIds.includes(col.id)}
                      onChange={() => {
                        setSelectedCollectionIds((prev) =>
                          prev.includes(col.id)
                            ? prev.filter((id) => id !== col.id)
                            : [...prev, col.id]
                        );
                      }}
                    />
                    <span>{col.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ─── Sub-component: Option Group Editor ─────────────────────

function OptionGroupEditor({
  group,
  onAddValue,
  onRemoveValue,
  onRemoveGroup,
}: {
  group: OptionGroupDraft;
  onAddValue: (value: string) => void;
  onRemoveValue: (index: number) => void;
  onRemoveGroup: () => void;
}) {
  const [newValue, setNewValue] = useState('');

  return (
    <div className="option-group">
      <div className="option-group-header">
        <h4>{group.name}</h4>
        <button className="row-action-btn danger" onClick={onRemoveGroup} title="Remove option">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="option-values">
        {group.values.map((val, vi) => (
          <span key={vi} className="option-value-tag">
            {val}
            <button onClick={() => onRemoveValue(vi)}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="option-add-value">
        <input
          type="text"
          className="form-input form-input-sm"
          placeholder={`Add ${group.name} value...`}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newValue.trim()) {
              onAddValue(newValue);
              setNewValue('');
            }
          }}
        />
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            if (newValue.trim()) {
              onAddValue(newValue);
              setNewValue('');
            }
          }}
          disabled={!newValue.trim()}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
