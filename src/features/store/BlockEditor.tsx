import { useState } from 'react';
import type { PageBlock, BlockType } from '@/types/database';
import { Plus, Trash2, ArrowUp, ArrowDown, X, Settings2 } from 'lucide-react';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { BlockLibrary } from './BlockLibrary';

interface Props {
  block: PageBlock;
  onChange: (config: Record<string, any>) => void;
}

export function BlockEditor({ block, onChange }: Props) {
  const c = block.config;

  const set = (key: string, value: any) => {
    onChange({ ...c, [key]: value });
  };

  switch (block.type) {
    case 'hero':
      return (
        <div className="pb-editor-fields">
          <Field label="Title">
            <input className="form-input" value={c.title || ''} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Subtitle">
            <input className="form-input" value={c.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} />
          </Field>
          <Field label="Background Image URL">
            <input className="form-input" value={c.imageUrl || ''} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="CTA Button Text">
            <input className="form-input" value={c.ctaText || ''} onChange={(e) => set('ctaText', e.target.value)} />
          </Field>
          <Field label="CTA Button Link">
            <input className="form-input" value={c.ctaLink || ''} onChange={(e) => set('ctaLink', e.target.value)} placeholder="/shop/products" />
          </Field>
          <Field label="Overlay Opacity">
            <input type="range" min="0" max="1" step="0.05" value={c.overlayOpacity || 0.4}
              onChange={(e) => set('overlayOpacity', Number(e.target.value))} />
            <span className="pb-range-val">{Math.round((c.overlayOpacity || 0.4) * 100)}%</span>
          </Field>
        </div>
      );

    case 'half_hero':
      return (
        <div className="pb-editor-fields">
          <Field label="Hero Image URL">
            <input className="form-input" value={c.imageUrl || ''} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Image Position">
            <select className="form-input" value={c.objectPosition || 'center'} onChange={(e) => set('objectPosition', e.target.value)}>
              <option value="top">Top</option>
              <option value="center">Center</option>
              <option value="bottom">Bottom</option>
            </select>
          </Field>
          <Field label="Height">
            <input className="form-input" value={c.height || '600px'} onChange={(e) => set('height', e.target.value)} placeholder="e.g. 600px or 100vh" />
          </Field>
          <Field label="Title (Optional)">
            <input className="form-input" value={c.title || ''} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="CTA Button Text (Optional)">
            <input className="form-input" value={c.ctaText || ''} onChange={(e) => set('ctaText', e.target.value)} />
          </Field>
          <Field label="CTA Button Link (Optional)">
            <input className="form-input" value={c.ctaLink || ''} onChange={(e) => set('ctaLink', e.target.value)} placeholder="/shop" />
          </Field>
        </div>
      );

    case 'heading':
      return (
        <div className="pb-editor-fields">
          <Field label="Text">
            <input className="form-input" value={c.text || ''} onChange={(e) => set('text', e.target.value)} />
          </Field>
          <Field label="Level">
            <select className="form-input" value={c.level || 'h2'} onChange={(e) => set('level', e.target.value)}>
              <option value="h1">H1 — Large</option>
              <option value="h2">H2 — Medium</option>
              <option value="h3">H3 — Small</option>
              <option value="h4">H4 — Extra Small</option>
            </select>
          </Field>
          <Field label="Alignment">
            <select className="form-input" value={c.align || 'center'} onChange={(e) => set('align', e.target.value)}>
              <option value="left">Left</option>
              <option value="center">Centre</option>
              <option value="right">Right</option>
            </select>
          </Field>
        </div>
      );

    case 'text':
      return (
        <div className="pb-editor-fields">
          <Field label="Text">
            <textarea className="form-input form-textarea" rows={5} value={c.text || ''} onChange={(e) => set('text', e.target.value)} />
          </Field>
          <Field label="Alignment">
            <select className="form-input" value={c.align || 'left'} onChange={(e) => set('align', e.target.value)}>
              <option value="left">Left</option>
              <option value="center">Centre</option>
              <option value="right">Right</option>
            </select>
          </Field>
        </div>
      );

    case 'image':
      return (
        <div className="pb-editor-fields">
          <Field label="Image URL">
            <input className="form-input" value={c.url || ''} onChange={(e) => set('url', e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Alt Text">
            <input className="form-input" value={c.alt || ''} onChange={(e) => set('alt', e.target.value)} />
          </Field>
          <Field label="Width">
            <input className="form-input" value={c.width || '100%'} onChange={(e) => set('width', e.target.value)} placeholder="100% or 500px" />
          </Field>
          <Field label="Alignment">
            <select className="form-input" value={c.align || 'center'} onChange={(e) => set('align', e.target.value)}>
              <option value="left">Left</option>
              <option value="center">Centre</option>
              <option value="right">Right</option>
            </select>
          </Field>
        </div>
      );

    case 'image_gallery':
      return (
        <div className="pb-editor-fields">
          <Field label="Images (one URL per line)">
            <textarea className="form-input form-textarea" rows={4}
              value={(c.images || []).join('\n')}
              onChange={(e) => set('images', e.target.value.split('\n').filter(Boolean))}
            />
          </Field>
          <Field label="Columns">
            <select className="form-input" value={c.columns || 3} onChange={(e) => set('columns', Number(e.target.value))}>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </Field>
        </div>
      );

    case 'button':
      return (
        <div className="pb-editor-fields">
          <Field label="Button Text">
            <input className="form-input" value={c.text || ''} onChange={(e) => set('text', e.target.value)} />
          </Field>
          <Field label="Link">
            <input className="form-input" value={c.link || ''} onChange={(e) => set('link', e.target.value)} placeholder="/shop/products" />
          </Field>
          <Field label="Style">
            <select className="form-input" value={c.style || 'primary'} onChange={(e) => set('style', e.target.value)}>
              <option value="primary">Primary (filled)</option>
              <option value="secondary">Secondary (outlined)</option>
              <option value="ghost">Ghost (text only)</option>
            </select>
          </Field>
          <Field label="Size">
            <select className="form-input" value={c.size || 'md'} onChange={(e) => set('size', e.target.value)}>
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </Field>
          <Field label="Alignment">
            <select className="form-input" value={c.align || 'center'} onChange={(e) => set('align', e.target.value)}>
              <option value="left">Left</option>
              <option value="center">Centre</option>
              <option value="right">Right</option>
            </select>
          </Field>
        </div>
      );

    case 'product_grid':
      return (
        <div className="pb-editor-fields">
          <Field label="Mode">
            <select className="form-input" value={c.mode || 'auto'} onChange={(e) => set('mode', e.target.value)}>
              <option value="auto">Auto — Show all visible products</option>
              <option value="manual">Manual — Choose specific products</option>
            </select>
          </Field>
          <Field label="Columns">
            <select className="form-input" value={c.columns || 4} onChange={(e) => set('columns', Number(e.target.value))}>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </Field>
          <Field label="Max Products">
            <input className="form-input" type="number" value={c.limit || 8} min="1" max="50"
              onChange={(e) => set('limit', Number(e.target.value))} />
          </Field>
        </div>
      );

    case 'collection_grid':
      return (
        <div className="pb-editor-fields">
          <Field label="Mode">
            <select className="form-input" value={c.mode || 'auto'} onChange={(e) => set('mode', e.target.value)}>
              <option value="auto">Auto — Show all collections</option>
              <option value="manual">Manual — Choose specific collections</option>
            </select>
          </Field>
          <Field label="Columns">
            <select className="form-input" value={c.columns || 3} onChange={(e) => set('columns', Number(e.target.value))}>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </Field>
        </div>
      );

    case 'collection_showcase':
      return (
        <div className="pb-editor-fields">
          <Field label="Title">
            <input className="form-input" value={c.title || ''} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Subtitle">
            <input className="form-input" value={c.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} />
          </Field>
          <Field label="Collection Slug or ID (Optional)">
            <input className="form-input" value={c.collectionId || ''} onChange={(e) => set('collectionId', e.target.value)} placeholder="e.g. spring-2026" />
          </Field>
          <Field label="Limit">
            <input className="form-input" type="number" value={c.limit || 5} onChange={(e) => set('limit', Number(e.target.value))} />
          </Field>
          <Field label="CTA Text">
            <input className="form-input" value={c.ctaText || ''} onChange={(e) => set('ctaText', e.target.value)} />
          </Field>
          <Field label="CTA Link">
            <input className="form-input" value={c.ctaLink || ''} onChange={(e) => set('ctaLink', e.target.value)} />
          </Field>
          <Field label="Show Swatches">
            <label className="pb-checkbox">
              <input type="checkbox" checked={c.showSwatches ?? true} onChange={(e) => set('showSwatches', e.target.checked)} />
              Show colour swatches beneath product images
            </label>
          </Field>
        </div>
      );

    case 'category_links':
      return (
        <div className="pb-editor-fields">
          {(c.items || []).map((item: any, i: number) => (
            <div className="ub-settings-item-box" key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Category {i + 1}</span>
                <button className="btn btn-ghost btn-icon-sm danger" onClick={() => {
                  const items = [...(c.items || [])];
                  items.splice(i, 1);
                  set('items', items);
                }} style={{ color: '#ef4444' }}>✕</button>
              </div>
              <input className="form-input" placeholder="Title (e.g. JACKETS)" value={item.title || ''}
                style={{ marginBottom: '0.5rem' }}
                onChange={(e) => { const items = [...(c.items || [])]; items[i] = { ...items[i], title: e.target.value }; set('items', items); }} />
              <input className="form-input" placeholder="Image URL" value={item.imageUrl || ''}
                style={{ marginBottom: '0.5rem' }}
                onChange={(e) => { const items = [...(c.items || [])]; items[i] = { ...items[i], imageUrl: e.target.value }; set('items', items); }} />
              <input className="form-input" placeholder="Link (e.g. /shop/collections/jackets)" value={item.link || ''}
                onChange={(e) => { const items = [...(c.items || [])]; items[i] = { ...items[i], link: e.target.value }; set('items', items); }} />
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => set('items', [...(c.items || []), { title: 'NEW', imageUrl: '', link: '' }])}>
            <Plus size={14} style={{ marginRight: 6 }}/> Add Category
          </button>
        </div>
      );

    case 'product_carousel':
      return (
        <div className="pb-editor-fields">
          <Field label="Title">
            <input className="form-input" value={c.title || ''} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Collection Slug or ID (Optional)">
            <input className="form-input" value={c.collectionId || ''} onChange={(e) => set('collectionId', e.target.value)} placeholder="e.g. best-sellers" />
          </Field>
          <Field label="Limit">
            <input className="form-input" type="number" value={c.limit || 10} onChange={(e) => set('limit', Number(e.target.value))} />
          </Field>
          <Field label="CTA Text (Optional)">
            <input className="form-input" value={c.ctaText || ''} onChange={(e) => set('ctaText', e.target.value)} />
          </Field>
          <Field label="CTA Link (Optional)">
            <input className="form-input" value={c.ctaLink || ''} onChange={(e) => set('ctaLink', e.target.value)} />
          </Field>
        </div>
      );

    case 'featured_product':
      return (
        <div className="pb-editor-fields">
          <Field label="Product ID">
            <input className="form-input" value={c.productId || ''} onChange={(e) => set('productId', e.target.value)}
              placeholder="Paste product ID" />
          </Field>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Tip: Copy the product ID from the product editor URL.
          </p>
        </div>
      );

    case 'spacer':
      return (
        <div className="pb-editor-fields">
          <Field label="Height (px)">
            <input className="form-input" type="number" value={c.height || 40} min="8" max="200"
              onChange={(e) => set('height', Number(e.target.value))} />
          </Field>
        </div>
      );

    case 'divider':
      return (
        <div className="pb-editor-fields">
          <Field label="Style">
            <select className="form-input" value={c.style || 'solid'} onChange={(e) => set('style', e.target.value)}>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </Field>
          <Field label="Colour">
            <ColorPicker value={c.color || '#e5e7eb'} onChange={(val) => set('color', val)} />
          </Field>
          <Field label="Thickness (px)">
            <input className="form-input" type="number" value={c.thickness || 1} min="1" max="10"
              onChange={(e) => set('thickness', Number(e.target.value))} />
          </Field>
        </div>
      );

    case 'video':
      return (
        <div className="pb-editor-fields">
          <Field label="Video URL">
            <input className="form-input" value={c.url || ''} onChange={(e) => set('url', e.target.value)}
              placeholder="https://youtube.com/watch?v=..." />
          </Field>
          <Field label="Autoplay">
            <label className="pb-checkbox">
              <input type="checkbox" checked={c.autoplay || false} onChange={(e) => set('autoplay', e.target.checked)} />
              Autoplay video
            </label>
          </Field>
        </div>
      );

    case 'banner':
      return (
        <div className="pb-editor-fields">
          <Field label="Text">
            <input className="form-input" value={c.text || ''} onChange={(e) => set('text', e.target.value)} />
          </Field>
          <Field label="Background Colour">
            <ColorPicker value={c.bgColor || '#1a1a2e'} onChange={(val) => set('bgColor', val)} />
          </Field>
          <Field label="Text Colour">
            <ColorPicker value={c.textColor || '#ffffff'} onChange={(val) => set('textColor', val)} />
          </Field>
          <Field label="Alignment">
            <select className="form-input" value={c.align || 'center'} onChange={(e) => set('align', e.target.value)}>
              <option value="left">Left</option>
              <option value="center">Centre</option>
              <option value="right">Right</option>
            </select>
          </Field>
        </div>
      );

    case 'ticker':
      return (
        <div className="pb-editor-fields">
          <Field label="Ticker Text">
            <input className="form-input" value={c.text || ''} onChange={(e) => set('text', e.target.value)} placeholder="📢 FREE SHIPPING ON ALL ORDERS" />
          </Field>
          <Field label="Scroll Speed (seconds)">
            <input type="number" className="form-input" value={c.speed || 30} onChange={(e) => set('speed', Number(e.target.value))} />
          </Field>
          <Field label="Background Colour">
            <ColorPicker value={c.bgColor || '#000000'} onChange={(val) => set('bgColor', val)} />
          </Field>
          <Field label="Text Colour">
            <ColorPicker value={c.textColor || '#ffffff'} onChange={(val) => set('textColor', val)} />
          </Field>
        </div>
      );

    case 'features':
      return (
        <div className="pb-editor-fields">
          {(c.items || []).map((item: any, i: number) => (
            <div className="ub-settings-item-box" key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Feature {i + 1}</span>
                <button className="btn btn-ghost btn-icon-sm danger" onClick={() => {
                  const items = [...(c.items || [])];
                  items.splice(i, 1);
                  set('items', items);
                }} style={{ color: '#ef4444' }}>✕</button>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Icon name (Lucide)</label>
                <input className="form-input" value={item.icon || 'star'} onChange={(e) => {
                  const items = [...(c.items || [])];
                  items[i] = { ...item, icon: e.target.value };
                  set('items', items);
                }} />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Title</label>
                <input className="form-input" value={item.title || ''} onChange={(e) => {
                  const items = [...(c.items || [])];
                  items[i] = { ...item, title: e.target.value };
                  set('items', items);
                }} />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea className="form-input form-textarea" rows={3} value={item.description || ''} onChange={(e) => {
                  const items = [...(c.items || [])];
                  items[i] = { ...item, description: e.target.value };
                  set('items', items);
                }} />
              </div>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => {
            set('items', [...(c.items || []), { icon: 'star', title: '', description: '' }]);
          }}>
            <Plus size={14} style={{ marginRight: 6 }}/> Add Feature
          </button>
        </div>
      );

    case 'testimonials':
      return (
        <div className="pb-editor-fields">
          {(c.items || []).map((item: any, i: number) => (
            <div className="ub-settings-item-box" key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Testimonial {i + 1}</span>
                <button className="btn btn-ghost btn-icon-sm danger" onClick={() => {
                  const items = [...(c.items || [])];
                  items.splice(i, 1);
                  set('items', items);
                }} style={{ color: '#ef4444' }}>✕</button>
              </div>
              <input className="form-input" placeholder="Customer name" value={item.name || ''}
                style={{ marginBottom: '0.5rem' }}
                onChange={(e) => { const items = [...(c.items || [])]; items[i] = { ...items[i], name: e.target.value }; set('items', items); }} />
              <textarea className="form-input form-textarea" rows={2} placeholder="Their quote..."
                style={{ marginBottom: '0.5rem' }}
                value={item.text || ''}
                onChange={(e) => { const items = [...(c.items || [])]; items[i] = { ...items[i], text: e.target.value }; set('items', items); }} />
              <select className="form-input" value={item.rating || 5}
                onChange={(e) => { const items = [...(c.items || [])]; items[i] = { ...items[i], rating: Number(e.target.value) }; set('items', items); }}>
                {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} ★</option>)}
              </select>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => set('items', [...(c.items || []), { name: '', text: '', rating: 5 }])}>
            <Plus size={14} style={{ marginRight: 6 }}/> Add Testimonial
          </button>
        </div>
      );

    case 'faq':
      return (
        <div className="pb-editor-fields">
          {(c.items || []).map((item: any, i: number) => (
            <div className="ub-settings-item-box" key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Question {i + 1}</span>
                <button className="btn btn-ghost btn-icon-sm danger" onClick={() => {
                  const items = [...(c.items || [])];
                  items.splice(i, 1);
                  set('items', items);
                }} style={{ color: '#ef4444' }}>✕</button>
              </div>
              <input className="form-input" placeholder="Question" value={item.question || ''}
                style={{ marginBottom: '0.5rem' }}
                onChange={(e) => { const items = [...(c.items || [])]; items[i] = { ...items[i], question: e.target.value }; set('items', items); }} />
              <textarea className="form-input form-textarea" rows={2} placeholder="Answer"
                value={item.answer || ''}
                onChange={(e) => { const items = [...(c.items || [])]; items[i] = { ...items[i], answer: e.target.value }; set('items', items); }} />
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => set('items', [...(c.items || []), { question: '', answer: '' }])}>
            <Plus size={14} style={{ marginRight: 6 }}/> Add Question
          </button>
        </div>
      );

    case 'custom_html':
      return (
        <div className="pb-editor-fields">
          <Field label="HTML">
            <textarea className="form-input form-textarea" rows={8} value={c.html || ''}
              onChange={(e) => set('html', e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }} />
          </Field>
        </div>
      );

    case 'container':
      return (
        <div className="pb-editor-fields">
          <Field label="Background Colour">
            <ColorPicker value={c.bgColor || 'transparent'} onChange={(val) => set('bgColor', val)} />
          </Field>
          <Field label="Padding">
            <input className="form-input" value={c.padding || '40px'} onChange={(e) => set('padding', e.target.value)} placeholder="e.g. 40px 20px" />
          </Field>
          <Field label="Max Width">
            <input className="form-input" value={c.maxWidth || '1200px'} onChange={(e) => set('maxWidth', e.target.value)} placeholder="e.g. 1200px or 100%" />
          </Field>
          
          <div className="pb-nested-section">
            <label className="form-label" style={{ marginTop: '1rem' }}>Inner Content</label>
            <NestedBlockEditor blocks={c.blocks || []} onChange={(blocks) => set('blocks', blocks)} />
          </div>
        </div>
      );

    case 'columns':
      const cols = c.columns || [[], []];
      return (
        <div className="pb-editor-fields">
          <Field label="Number of Columns">
            <select className="form-input" value={cols.length} onChange={(e) => {
              const len = Number(e.target.value);
              const newCols = [...cols];
              if (len > newCols.length) {
                while (newCols.length < len) newCols.push([]);
              } else if (len < newCols.length) {
                newCols.splice(len);
              }
              set('columns', newCols);
            }}>
              <option value="1">1 Column</option>
              <option value="2">2 Columns</option>
              <option value="3">3 Columns</option>
              <option value="4">4 Columns</option>
            </select>
          </Field>
          <Field label="Gap (px)">
            <input className="form-input" type="number" value={c.gap || 16} min="0" max="100" onChange={(e) => set('gap', Number(e.target.value))} />
          </Field>
          <Field label="Mobile Layout">
            <label className="pb-checkbox">
              <input type="checkbox" checked={c.stackOnMobile ?? true} onChange={(e) => set('stackOnMobile', e.target.checked)} />
              Stack columns on mobile
            </label>
          </Field>

          {cols.map((colBlocks: PageBlock[], idx: number) => (
            <div key={idx} className="pb-nested-section" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <label className="form-label">Column {idx + 1} Content</label>
              <NestedBlockEditor
                blocks={colBlocks}
                onChange={(blocks) => {
                  const newCols = [...cols];
                  newCols[idx] = blocks;
                  set('columns', newCols);
                }}
              />
            </div>
          ))}
        </div>
      );

    default:
      return <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>No settings available for this block type.</p>;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

// ─── Nested Block Editor ──────────────────────────────────────

function getNestedDefaultConfig(type: BlockType): Record<string, any> {
  // Simple subset of getDefaultConfig for nested usage
  switch (type) {
    case 'heading': return { text: 'Heading', level: 'h3', align: 'left' };
    case 'text': return { text: 'Enter text here...', align: 'left' };
    case 'image': return { url: '', alt: '', width: '100%', align: 'center' };
    case 'button': return { text: 'Click Here', link: '', style: 'primary', align: 'left', size: 'md' };
    case 'spacer': return { height: 20 };
    case 'divider': return { style: 'solid', color: '#e5e7eb', thickness: 1 };
    case 'custom_html': return { html: '' };
    default: return {};
  }
}

function NestedBlockEditor({ blocks, onChange }: { blocks: PageBlock[], onChange: (blocks: PageBlock[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showLib, setShowLib] = useState(false);

  const addBlock = (type: BlockType) => {
    const id = Math.random().toString(36).slice(2, 10);
    onChange([...blocks, { id, type, config: getNestedDefaultConfig(type) }]);
    setShowLib(false);
    setEditingId(id);
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const moveBlock = (index: number, dir: 'up'|'down') => {
    const newBlocks = [...blocks];
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newBlocks.length) return;
    [newBlocks[index], newBlocks[target]] = [newBlocks[target], newBlocks[index]];
    onChange(newBlocks);
  };

  const updateBlock = (id: string, config: any) => {
    onChange(blocks.map(b => b.id === id ? { ...b, config } : b));
  };

  const editingBlock = blocks.find(b => b.id === editingId);

  return (
    <div className="pb-nested-editor">
      <div className="pb-nested-list" style={{ border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-surface)' }}>
        {blocks.length === 0 && <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No blocks yet.</div>}
        {blocks.map((b, i) => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', borderBottom: i < blocks.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
            <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>{b.type.replace('_', ' ').toUpperCase()}</div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button className="btn btn-ghost btn-icon-sm" onClick={() => setEditingId(editingId === b.id ? null : b.id)}><Settings2 size={14} /></button>
              <button className="btn btn-ghost btn-icon-sm" onClick={() => moveBlock(i, 'up')} disabled={i === 0}><ArrowUp size={14} /></button>
              <button className="btn btn-ghost btn-icon-sm" onClick={() => moveBlock(i, 'down')} disabled={i === blocks.length - 1}><ArrowDown size={14} /></button>
              <button className="btn btn-ghost btn-icon-sm danger" onClick={() => removeBlock(b.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      
      <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem', width: '100%' }} onClick={() => setShowLib(true)}>
        <Plus size={14} /> Add Block
      </button>

      {editingBlock && (
        <div className="pb-nested-inline-edit" style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
            <h5 style={{ margin: 0 }}>Editing {editingBlock.type}</h5>
            <button className="btn btn-ghost btn-icon-sm" onClick={() => setEditingId(null)}><X size={14} /></button>
          </div>
          <BlockEditor block={editingBlock} onChange={(config) => updateBlock(editingBlock.id, config)} />
        </div>
      )}

      {showLib && <BlockLibrary onSelect={addBlock} onClose={() => setShowLib(false)} />}
    </div>
  );
}
