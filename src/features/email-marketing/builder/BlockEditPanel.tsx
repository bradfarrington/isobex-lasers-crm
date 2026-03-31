import { useState, useRef, useEffect, useCallback } from 'react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import ReactQuill from 'react-quill-new';
import { ArrowLeft, Trash2, X, Tag, Search } from 'lucide-react';
import { BLOCK_TYPE_MAP, QUILL_FULL, QUILL_HEADING, QUILL_FORMATS, MERGE_TAGS, BRAND, SOCIAL_PLATFORMS } from './constants';
import type { BlockData } from './constants';
import { ColorField, AlignField, FontPicker, ImageUploadButton, MergeTagInsert, BlockSpacing } from './components';
import { supabase } from '@/lib/supabase';
import { DateTimePicker } from '@/components/ui/DatePicker';

interface Props {
  block: BlockData;
  onUpdate: (patch: Record<string, any>) => void;
  onDelete: () => void;
  onBack?: () => void;
}

export function BlockEditPanel({ block, onUpdate, onDelete, onBack }: Props) {
  const def = BLOCK_TYPE_MAP[block.type] || {};
  const Icon = def.icon || Tag;
  const patch = (k: string, v: any) => onUpdate({ data: { ...block.data, [k]: v } });
  const patchPad = (side: string, val: string) => {
    const p = { ...(block.data.padding || { top: 0, right: 0, bottom: 0, left: 0 }), [side]: Number(val) || 0 };
    onUpdate({ data: { ...block.data, padding: p } });
  };
  const quillRef = useRef<any>(null);
  const savedSel = useRef<any>(null);
  const quillWrapRef1 = useRef<HTMLDivElement>(null);
  const quillWrapRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleQuillMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.ql-action') || target.closest('.ql-remove') || target.closest('.ql-preview')) {
        e.preventDefault();
      }
    };
    const wrap1 = quillWrapRef1.current;
    const wrap2 = quillWrapRef2.current;
    if (wrap1) wrap1.addEventListener('mousedown', handleQuillMouseDown, { capture: true });
    if (wrap2) wrap2.addEventListener('mousedown', handleQuillMouseDown, { capture: true });
    
    return () => {
      if (wrap1) wrap1.removeEventListener('mousedown', handleQuillMouseDown, { capture: true });
      if (wrap2) wrap2.removeEventListener('mousedown', handleQuillMouseDown, { capture: true });
    };
  }, [block.type]);

  useEffect(() => {
    const ed = quillRef.current?.getEditor?.();
    if (!ed) return;
    const h = (r: any) => { if (r) savedSel.current = r; };
    ed.on('selection-change', h);
    return () => ed.off('selection-change', h);
  }, [block.type]);

  const insertTag = useCallback((tag: string) => {
    const ed = quillRef.current?.getEditor?.();
    if (!ed) { patch('content', (block.data.content || '') + tag); return; }
    const sel = ed.getSelection() || savedSel.current;
    const pos = sel ? sel.index : ed.getLength() - 1;
    ed.focus(); ed.insertText(pos, tag); ed.setSelection(pos + tag.length);
  }, [block.data.content]);

  return (
    <>
      <div className="eb-right-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onBack && <button type="button" className="row-action-btn" onClick={onBack}><ArrowLeft size={14} /></button>}
          <Icon size={13} /><span style={{ fontWeight: 700 }}>{def.label || block.type}</span>
        </div>
        <button type="button" className="row-action-btn danger" onClick={onDelete} style={{ marginLeft: 'auto' }}><Trash2 size={14} /></button>
      </div>
      <div className="eb-right-scroll">
        {/* ── Heading ── */}
        {block.type === 'heading' && (<>
          <div className="form-group"><label>Content</label>
            <div className="eb-quill-wrap" ref={quillWrapRef1}><ReactQuill theme="snow" value={block.data.content || ''} onChange={v => patch('content', v)} modules={QUILL_HEADING} formats={QUILL_FORMATS} placeholder="Heading…" /></div>
          </div>
          <div className="form-group"><label>Level</label>
            <SearchableSelect className="form-select" value={block.data.level || 'h2'} onChange={(val) => patch('level', val)}
  searchable={false}
  sort={false}
  options={[
    { label: 'H1 — Large', value: 'h1' },
    { label: 'H2 — Medium', value: 'h2' },
    { label: 'H3 — Small', value: 'h3' }
  ]}
/>
          </div>
          <FontPicker value={block.data.fontFamily || ''} onChange={v => patch('fontFamily', v)} />
          <ColorField label="Text Colour" value={block.data.color} onChange={v => patch('color', v)} defaultValue="#1f2937" />
          <ColorField label="Background Colour" value={block.data.bgColor || ''} onChange={v => patch('bgColor', v)} />
        </>)}

        {/* ── Text ── */}
        {block.type === 'text' && (<>
          <div className="form-group"><label>Content</label>
            <div className="eb-quill-wrap" ref={quillWrapRef2}><ReactQuill ref={quillRef} theme="snow" value={block.data.content || ''} onChange={v => patch('content', v)} modules={QUILL_FULL} formats={QUILL_FORMATS} placeholder="Write content…" /></div>
          </div>
          <MergeTagInsert onInsert={insertTag} />
          <FontPicker value={block.data.fontFamily || ''} onChange={v => patch('fontFamily', v)} />
          <ColorField label="Text Colour" value={block.data.color} onChange={v => patch('color', v)} defaultValue="#1f2937" />
          <ColorField label="Background Colour" value={block.data.bgColor || ''} onChange={v => patch('bgColor', v)} />
        </>)}

        {/* ── Image ── */}
        {block.type === 'image' && (<>
          <div className="form-group"><label>Image</label>
            {block.data.src && <div style={{ marginBottom: 8, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}><img src={block.data.src} alt="" style={{ width: '100%', display: 'block' }} /></div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <ImageUploadButton onUploaded={url => patch('src', url)} />
              {block.data.src && <button type="button" className="row-action-btn" onClick={() => patch('src', '')}><X size={13} /></button>}
            </div>
          </div>
          {!block.data.src && <div className="form-group"><label>Or paste URL</label><input className="form-input" value={block.data.src || ''} onChange={e => patch('src', e.target.value)} placeholder="https://…" /></div>}
          <div className="form-group"><label>Alt Text</label><input className="form-input" value={block.data.alt || ''} onChange={e => patch('alt', e.target.value)} placeholder="Describe…" /></div>
          <div className="form-group"><label>Width ({block.data.width || 100}%)</label><input type="range" min="20" max="100" step="5" value={block.data.width || 100} onChange={e => patch('width', e.target.value)} style={{ width: '100%' }} /></div>
          <AlignField value={block.data.align} onChange={v => patch('align', v)} />
          <div className="form-group"><label>Border Radius ({block.data.borderRadius || 0}px)</label><input type="range" min="0" max="500" value={block.data.borderRadius || 0} onChange={e => patch('borderRadius', e.target.value)} style={{ width: '100%' }} /></div>
          <div className="form-group"><label>Link URL</label><input className="form-input" value={block.data.link || ''} onChange={e => patch('link', e.target.value)} placeholder="https://…" /></div>
        </>)}

        {/* ── Button ── */}
        {block.type === 'button' && (<>
          <div className="form-group"><label>Button Text</label><input className="form-input" value={block.data.text || ''} onChange={e => patch('text', e.target.value)} /></div>
          <div className="form-group">
            <label>Link URL</label>
            <input className="form-input" value={block.data.link || ''} onChange={e => patch('link', e.target.value)} placeholder="https://… or {{merge_tag}}" />
            <div style={{ marginTop: 4 }}><MergeTagInsert onInsert={tag => patch('link', tag)} /></div>
          </div>
          <AlignField value={block.data.align} onChange={v => patch('align', v)} />
          <div className="eb-divider" /><div className="eb-section-label">Colours</div>
          <ColorField label="Background" value={block.data.bgColor} onChange={v => patch('bgColor', v)} defaultValue={BRAND} />
          <ColorField label="Text" value={block.data.textColor} onChange={v => patch('textColor', v)} defaultValue="#ffffff" />
          <div className="eb-divider" /><div className="eb-section-label">Typography</div>
          <FontPicker value={block.data.fontFamily || ''} onChange={v => patch('fontFamily', v)} />
          <div className="form-group"><label>Font Size</label><input className="form-input" type="number" value={block.data.fontSize || 15} onChange={e => patch('fontSize', e.target.value)} min={10} max={32} /></div>
          <div className="form-group"><label>Font Weight</label>
            <SearchableSelect className="form-select" value={block.data.fontWeight || '600'} onChange={(val) => patch('fontWeight', val)}
  searchable={false}
  sort={false}
  options={[
    { label: 'Normal', value: '400' },
    { label: 'Medium', value: '500' },
    { label: 'Semi Bold', value: '600' },
    { label: 'Bold', value: '700' }
  ]}
/>
          </div>
          <div className="eb-divider" /><div className="eb-section-label">Size & Shape</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}><label>Pad V</label><input className="form-input" type="number" value={block.data.paddingV || 12} onChange={e => patch('paddingV', e.target.value)} min={4} max={40} /></div>
            <div className="form-group" style={{ marginBottom: 0 }}><label>Pad H</label><input className="form-input" type="number" value={block.data.paddingH || 32} onChange={e => patch('paddingH', e.target.value)} min={8} max={80} /></div>
          </div>
          <div className="form-group"><label>Border Radius</label><input className="form-input" type="number" value={block.data.borderRadius || 8} onChange={e => patch('borderRadius', e.target.value)} min={0} max={500} /></div>
          <label className="eb-toggle" onClick={() => patch('fullWidth', !block.data.fullWidth)}>
            <span>Full Width</span><div className={`toggle-track${block.data.fullWidth ? ' on' : ''}`}><div className="toggle-thumb" /></div>
          </label>
        </>)}

        {/* ── Divider ── */}
        {block.type === 'divider' && (<>
          <div className="form-group"><label>Style</label>
            <SearchableSelect className="form-select" value={block.data.style || 'solid'} onChange={(val) => patch('style', val)}
  searchable={false}
  sort={false}
  options={[
    { label: 'Solid', value: 'solid' },
    { label: 'Dashed', value: 'dashed' },
    { label: 'Dotted', value: 'dotted' }
  ]}
/>
          </div>
          <div className="form-group"><label>Thickness (px)</label><input className="form-input" type="number" value={block.data.thickness || 1} onChange={e => patch('thickness', e.target.value)} min={1} max={10} /></div>
          <ColorField label="Colour" value={block.data.color} onChange={v => patch('color', v)} defaultValue="#e5e7eb" />
          <div className="form-group"><label>Width ({block.data.width || 100}%)</label><input type="range" min="10" max="100" step="5" value={block.data.width || 100} onChange={e => patch('width', e.target.value)} style={{ width: '100%' }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}><label>Margin Top</label><input className="form-input" type="number" value={block.data.marginTop || 8} onChange={e => patch('marginTop', e.target.value)} min={0} max={60} /></div>
            <div className="form-group" style={{ marginBottom: 0 }}><label>Margin Bottom</label><input className="form-input" type="number" value={block.data.marginBottom || 8} onChange={e => patch('marginBottom', e.target.value)} min={0} max={60} /></div>
          </div>
        </>)}

        {/* ── Spacer ── */}
        {block.type === 'spacer' && (<>
          <div className="form-group"><label>Height (px)</label>
            <input type="range" min="8" max="120" value={block.data.height || 32} onChange={e => patch('height', e.target.value)} style={{ width: '100%' }} />
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>{block.data.height || 32}px</div>
          </div>
          <ColorField label="Background Colour" value={block.data.bgColor || ''} onChange={v => patch('bgColor', v)} />
        </>)}

        {/* ── Columns ── */}
        {block.type === 'columns' && (<>
          <div className="form-group"><label>Layout</label>
            <SearchableSelect className="form-select" value={block.data.layout || '50-50'} onChange={layout => {
              const n = layout.split('-').length;
              const cols = Array.from({ length: n }, () => ({ bgColor: '', padding: '' }));
              patch('layout', layout); patch('columns', cols);
            }}
              searchable={false}
              sort={false}
              options={[
                { label: '50 / 50', value: '50-50' },
                { label: '33 / 67', value: '33-67' },
                { label: '67 / 33', value: '67-33' },
                { label: '33 / 33 / 33', value: '33-33-33' }
              ]}
            />
          </div>
          <div className="form-group"><label>Gap ({block.data.gap || 16}px)</label><input type="range" min="0" max="40" step="2" value={block.data.gap || 16} onChange={e => patch('gap', e.target.value)} style={{ width: '100%' }} /></div>
          <div className="eb-divider" /><div className="eb-section-label">Column Backgrounds</div>
          {(block.data.columns || []).map((col: any, ci: number) => (
            <ColorField key={ci} label={`Column ${ci + 1}`} value={col.bgColor || ''} onChange={v => {
              const cols = [...(block.data.columns || [])];
              cols[ci] = { ...cols[ci], bgColor: v };
              onUpdate({ data: { ...block.data, columns: cols } });
            }} />
          ))}
        </>)}

        {/* ── Merge Tag ── */}
        {block.type === 'merge_tag' && (<>
          <div className="form-group"><label>Tag</label>
            <select className="form-select" value={block.data.tag} onChange={e => patch('tag', e.target.value)}>
              {MERGE_TAGS.map(g => <optgroup key={g.group} label={g.group}>{g.tags.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>)}
            </select>
          </div>
          <div className="form-group"><label>Fallback Text</label><input className="form-input" value={block.data.fallback || ''} onChange={e => patch('fallback', e.target.value)} placeholder="Shown if unavailable" /></div>
          <div className="form-group"><label>Font Size</label><input className="form-input" type="number" value={block.data.fontSize || 15} onChange={e => patch('fontSize', e.target.value)} min={10} max={32} /></div>
          <ColorField label="Colour" value={block.data.color} onChange={v => patch('color', v)} />
        </>)}

        {/* ── Social Links ── */}
        {block.type === 'social' && (<>
          <div className="eb-section-label">Platform URLs</div>
          {SOCIAL_PLATFORMS.map(p => (
            <div className="form-group" key={p.key}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, display: 'inline-block', flexShrink: 0 }} />
                {p.label}
              </label>
              <input className="form-input" value={(block.data.platforms || {})[p.key] || ''}
                onChange={e => patch('platforms', { ...block.data.platforms, [p.key]: e.target.value })}
                placeholder={`https://${p.key}.com/…`} />
            </div>
          ))}
          <div className="eb-divider" /><div className="eb-section-label">Appearance</div>
          <div className="form-group"><label>Icon Size ({block.data.iconSize || 32}px)</label>
            <input type="range" min="20" max="56" step="2" value={block.data.iconSize || 32} onChange={e => patch('iconSize', e.target.value)} style={{ width: '100%' }} />
          </div>
          <div className="form-group"><label>Spacing ({block.data.spacing || 12}px)</label>
            <input type="range" min="4" max="32" step="2" value={block.data.spacing || 12} onChange={e => patch('spacing', e.target.value)} style={{ width: '100%' }} />
          </div>
          <AlignField value={block.data.align} onChange={v => patch('align', v)} />
        </>)}

        {/* ── Custom HTML ── */}
        {block.type === 'html' && (<>
          <div className="form-group"><label>HTML Code</label>
            <textarea className="form-textarea" value={block.data.content || ''} onChange={e => patch('content', e.target.value)}
              rows={10} style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }}
              placeholder="<div style='...'>Your custom HTML</div>" />
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.4, margin: 0 }}>Use inline styles for email compatibility. External CSS won't work in most email clients.</p>
        </>)}

        {/* ── Video ── */}
        {block.type === 'video' && (<>
          <div className="form-group"><label>Video URL</label>
            <input className="form-input" value={block.data.videoUrl || ''} onChange={e => patch('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=…" />
          </div>
          <div className="form-group"><label>Thumbnail</label>
            {block.data.thumbnailUrl && <div style={{ marginBottom: 8, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}><img src={block.data.thumbnailUrl} alt="" style={{ width: '100%', display: 'block' }} /></div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <ImageUploadButton onUploaded={url => patch('thumbnailUrl', url)} />
              {block.data.thumbnailUrl && <button type="button" className="row-action-btn" onClick={() => patch('thumbnailUrl', '')}><X size={13} /></button>}
            </div>
          </div>
          {!block.data.thumbnailUrl && <div className="form-group"><label>Or paste thumbnail URL</label><input className="form-input" value={block.data.thumbnailUrl || ''} onChange={e => patch('thumbnailUrl', e.target.value)} placeholder="https://…" /></div>}
          <div className="form-group"><label>Alt Text</label><input className="form-input" value={block.data.alt || ''} onChange={e => patch('alt', e.target.value)} placeholder="Describe the video…" /></div>
          <div className="form-group"><label>Width ({block.data.width || 100}%)</label><input type="range" min="20" max="100" step="5" value={block.data.width || 100} onChange={e => patch('width', e.target.value)} style={{ width: '100%' }} /></div>
          <AlignField value={block.data.align} onChange={v => patch('align', v)} />
          <div className="form-group"><label>Border Radius ({block.data.borderRadius || 0}px)</label><input type="range" min="0" max="40" value={block.data.borderRadius || 0} onChange={e => patch('borderRadius', e.target.value)} style={{ width: '100%' }} /></div>
        </>)}

        {/* ── Countdown ── */}
        {block.type === 'countdown' && (<>
          <div className="form-group"><label>End Date & Time</label>
            <DateTimePicker value={block.data.endDate || ''} onChange={v => patch('endDate', v)} placeholder="Select end date…" />
          </div>
          <div className="form-group"><label>Label Text</label><input className="form-input" value={block.data.label || ''} onChange={e => patch('label', e.target.value)} placeholder="Offer ends" /></div>
          <div className="form-group"><label>Font Size</label><input className="form-input" type="number" value={block.data.fontSize || 18} onChange={e => patch('fontSize', e.target.value)} min={12} max={48} /></div>
          <ColorField label="Background" value={block.data.bgColor} onChange={v => patch('bgColor', v)} defaultValue={BRAND} />
          <ColorField label="Text Colour" value={block.data.textColor} onChange={v => patch('textColor', v)} defaultValue="#ffffff" />
        </>)}

        {/* ── Product ── */}
        {block.type === 'product' && (<ProductBlockEditor block={block} patch={patch} onUpdate={onUpdate} />)}

        <BlockSpacing padding={block.data.padding} onChange={patchPad} />
      </div>
    </>
  );
}

function ProductBlockEditor({ block, patch, onUpdate }: {
  block: BlockData; patch: (k: string, v: any) => void; onUpdate: (p: Record<string, any>) => void;
}) {
  const source = block.data.source || 'products'; // 'products' | 'collection'
  const selectedIds: string[] = block.data.productIds || [];
  const getPrice = (p: any) => {
    if (p.variant_price_min != null && p.variant_price_min > 0) return `£${Number(p.variant_price_min).toFixed(2)}`;
    return `£${Number(p.price || 0).toFixed(2)}`;
  };

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Load all products + collections on mount
  useEffect(() => {
    setLoading(true);
    (async () => {
      // Fetch products (no variant fields on this table)
      const { data: prods } = await supabase.from('products').select('id, name, price, slug').order('name').limit(200);
      const products = prods || [];

      // Fetch variant min prices
      const { data: variants } = await supabase.from('product_variants').select('product_id, price_override');
      const variantPrices = new Map<string, number>();
      (variants || []).forEach((v: any) => {
        if (v.price_override != null && v.price_override > 0) {
          const cur = variantPrices.get(v.product_id);
          if (cur == null || v.price_override < cur) variantPrices.set(v.product_id, v.price_override);
        }
      });

      // Enrich products with variant pricing
      const enriched = products.map(p => ({
        ...p,
        variant_price_min: variantPrices.get(p.id) ?? null,
      }));
      setAllProducts(enriched);
      setLoading(false);
    })();
    supabase.from('collections').select('id, name').order('sort_order')
      .then(({ data }) => { if (data) setCollections(data); });
  }, []);

  const toggleProduct = (id: string) => {
    if (selectedIds.includes(id)) {
      patch('productIds', selectedIds.filter(x => x !== id));
    } else {
      patch('productIds', [...selectedIds, id]);
    }
  };

  const filtered = filter.trim()
    ? allProducts.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
    : allProducts;

  return (
    <>
      {/* Source toggle */}
      <div className="form-group">
        <label>Source</label>
        <div className="eb-align-toggle">
          <button type="button" className={`eb-align-btn${source === 'products' ? ' active' : ''}`}
            onClick={() => onUpdate({ data: { ...block.data, source: 'products', collectionId: '' } })}
            style={{ fontSize: 12 }}>Products</button>
          <button type="button" className={`eb-align-btn${source === 'collection' ? ' active' : ''}`}
            onClick={() => onUpdate({ data: { ...block.data, source: 'collection', productIds: [] } })}
            style={{ fontSize: 12 }}>Collection</button>
        </div>
      </div>

      {/* Products mode — checklist */}
      {source === 'products' && (
        <div className="form-group">
          <label>Products{selectedIds.length > 0 ? ` (${selectedIds.length} selected)` : ''}</label>
          <div style={{ position: 'relative', marginBottom: 6 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }} />
            <input className="form-input" value={filter} onChange={e => setFilter(e.target.value)}
              placeholder="Filter products…" style={{ paddingLeft: 32 }} />
          </div>
          <div style={{
            maxHeight: 240, overflowY: 'auto', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', background: 'var(--color-bg-surface)',
          }}>
            {loading && <div style={{ padding: 12, fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>Loading products…</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: 12, fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>No products found</div>}
            {filtered.map(p => {
              const checked = selectedIds.includes(p.id);
              return (
                <label key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                  cursor: 'pointer', borderBottom: '1px solid var(--color-border)',
                  background: checked ? 'var(--color-primary-subtle)' : 'transparent',
                  transition: 'background 0.1s',
                }} onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-hover)'; }}
                   onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = checked ? 'var(--color-primary-subtle)' : 'transparent'; }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleProduct(p.id)}
                    style={{ accentColor: 'var(--color-primary)', width: 15, height: 15, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: checked ? 600 : 400, color: 'var(--color-text-primary)' }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{getPrice(p)}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Collection mode */}
      {source === 'collection' && (
        <div className="form-group">
          <label>Collection</label>
          <SearchableSelect
            className="form-input"
            value={block.data.collectionId || ''}
            onChange={val => patch('collectionId', val)}
            searchable={true}
            options={[
              { label: 'Select a collection…', value: '' },
              ...collections.map(c => ({ label: c.name, value: c.id }))
            ]}
          />
        </div>
      )}

      <div className="eb-divider" /><div className="eb-section-label">Display Options</div>
      <label className="eb-toggle" onClick={() => patch('showImage', !block.data.showImage)}>
        <span>Show Image</span><div className={`toggle-track${block.data.showImage !== false ? ' on' : ''}`}><div className="toggle-thumb" /></div>
      </label>
      <label className="eb-toggle" onClick={() => patch('showPrice', !block.data.showPrice)}>
        <span>Show Price</span><div className={`toggle-track${block.data.showPrice !== false ? ' on' : ''}`}><div className="toggle-thumb" /></div>
      </label>
      <label className="eb-toggle" onClick={() => patch('showDescription', !block.data.showDescription)}>
        <span>Show Description</span><div className={`toggle-track${block.data.showDescription ? ' on' : ''}`}><div className="toggle-thumb" /></div>
      </label>
      <div className="form-group"><label>Button Text</label><input className="form-input" value={block.data.buttonText || ''} onChange={e => patch('buttonText', e.target.value)} placeholder="Shop Now" /></div>
      <ColorField label="Button Colour" value={block.data.buttonColor} onChange={v => patch('buttonColor', v)} defaultValue={BRAND} />
    </>
  );
}
