import { useState, useEffect, useRef } from 'react';
import type { PageBlock } from '@/types/database';
import { Plus, Trash2, Upload, ChevronDown, Search, Loader2 } from 'lucide-react';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { supabase } from '@/lib/supabase';
import * as api from '@/lib/api';
import type { Collection } from '@/types/database';

interface Props {
  block: PageBlock;
  onChange: (config: Record<string, any>) => void;
  editingColumnIndex?: number;
  onColumnStyleChange?: (styles: Record<string, any>) => void;
  onRemoveSubBlock?: (subBlockId: string) => void;
}

export function BlockEditor({ block, onChange, editingColumnIndex, onColumnStyleChange, onRemoveSubBlock }: Props) {
  const c = block.config;

  const set = (key: string, value: any) => {
    onChange({ ...c, [key]: value });
  };

  switch (block.type) {
    case 'hero':
      return <HeroBannerEditor config={c} set={set} />;

    case 'half_hero':
      return <HalfHeroEditor config={c} set={set} />;

    case 'heading':
      return (
        <div className="builder-panel-content">
          <Card title="Content">
            <Field label="Text">
              <input className="form-input" value={c.text || ''} onChange={(e) => set('text', e.target.value)} />
            </Field>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
          </Card>
          <Card title="Typography">
            <BlockFontPicker label="Font Family" value={c.fontFamily || ''} onChange={(val) => set('fontFamily', val)} />
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
              <Field label="Size (px)">
                <input className="form-input" type="number" value={c.fontSize || ''} min="8" max="150"
                  onChange={(e) => set('fontSize', e.target.value ? Number(e.target.value) : '')} placeholder="Auto" />
              </Field>
              <Field label="Weight">
                <select className="form-input" value={c.fontWeight || ''} onChange={(e) => set('fontWeight', e.target.value)}>
                  <option value="">Default</option>
                  <option value="300">Light (300)</option>
                  <option value="400">Regular (400)</option>
                  <option value="500">Medium (500)</option>
                  <option value="600">Semi Bold (600)</option>
                  <option value="700">Bold (700)</option>
                  <option value="800">Extra Bold (800)</option>
                  <option value="900">Black (900)</option>
                </select>
              </Field>
            </div>
            <InlineColor label="Colour" value={c.color || ''} onChange={(val) => set('color', val)} />
          </Card>
        </div>
      );

    case 'text':
      return (
        <div className="builder-panel-content">
          <Card title="Content">
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
          </Card>
        </div>
      );

    case 'image':
      return <ImageBlockEditor config={c} set={set} />;

    case 'image_gallery':
      return <ImageGalleryEditor config={c} set={set} />;

    case 'button':
      return (
        <div className="builder-panel-content">
          <Card title="Button">
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Text">
                <input className="form-input" value={c.text || ''} onChange={(e) => set('text', e.target.value)} />
              </Field>
              <Field label="Link">
                <input className="form-input" value={c.link || ''} onChange={(e) => set('link', e.target.value)} placeholder="/shop" />
              </Field>
            </div>
          </Card>
          <Card title="Style">
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Radius (px)">
                <input className="form-input" type="number" value={c.borderRadius || ''} min="0" max="100"
                  onChange={(e) => set('borderRadius', e.target.value ? Number(e.target.value) : '')} placeholder="Default" />
              </Field>
            </div>
          </Card>
          <Card title="Typography & Colours" desc="Overrides preset styles.">
            <BlockFontPicker label="Font Family" value={c.fontFamily || ''} onChange={(val) => set('fontFamily', val)} />
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
              <Field label="Size (px)">
                <input className="form-input" type="number" value={c.fontSize || ''} min="8" max="150"
                  onChange={(e) => set('fontSize', e.target.value ? Number(e.target.value) : '')} placeholder="Auto" />
              </Field>
              <Field label="Weight">
                <select className="form-input" value={c.fontWeight || ''} onChange={(e) => set('fontWeight', e.target.value)}>
                  <option value="">Default</option>
                  <option value="300">Light (300)</option>
                  <option value="400">Regular (400)</option>
                  <option value="500">Medium (500)</option>
                  <option value="600">Semi Bold (600)</option>
                  <option value="700">Bold (700)</option>
                  <option value="800">Extra Bold (800)</option>
                  <option value="900">Black (900)</option>
                </select>
              </Field>
            </div>
            <InlineColor label="Text Colour" value={c.textColor || ''} onChange={(val) => set('textColor', val)} />
            <div style={{ paddingBottom: '0.75rem' }} />
            <InlineColor label="Background Colour" value={c.bgColor || ''} onChange={(val) => set('bgColor', val)} />
          </Card>
        </div>
      );

    case 'product_grid':
      return (
        <div className="builder-panel-content">
          <Card title="Products">
            <Field label="Mode">
              <select className="form-input" value={c.mode || 'auto'} onChange={(e) => set('mode', e.target.value)}>
                <option value="auto">Auto — Show all visible products</option>
                <option value="manual">Manual — Choose specific products</option>
              </select>
            </Field>
          </Card>
          <Card title="Layout">
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
          </Card>
        </div>
      );

    case 'collection_grid':
      return (
        <div className="builder-panel-content">
          <Card title="Collections">
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
          </Card>
        </div>
      );

    case 'collection_showcase':
      return (
        <div className="builder-panel-content">
          <Card title="Content">
            <Field label="Title">
              <input className="form-input" value={c.title || ''} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field label="Subtitle">
              <input className="form-input" value={c.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} />
            </Field>
          </Card>
          <Card title="Collection">
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <Field label="Collection Slug or ID">
                <input className="form-input" value={c.collectionId || ''} onChange={(e) => set('collectionId', e.target.value)} placeholder="e.g. spring-2026" />
              </Field>
              <Field label="Limit">
                <input className="form-input" type="number" value={c.limit || 5} onChange={(e) => set('limit', Number(e.target.value))} />
              </Field>
            </div>
          </Card>
          <Card title="Call to Action">
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="CTA Text">
                <input className="form-input" value={c.ctaText || ''} onChange={(e) => set('ctaText', e.target.value)} />
              </Field>
              <Field label="CTA Link">
                <input className="form-input" value={c.ctaLink || ''} onChange={(e) => set('ctaLink', e.target.value)} />
              </Field>
            </div>
            <Field label="">
              <label className="pb-checkbox">
                <input type="checkbox" checked={c.showSwatches ?? true} onChange={(e) => set('showSwatches', e.target.checked)} />
                Show colour swatches
              </label>
            </Field>
          </Card>
        </div>
      );

    case 'category_links':
      return <CategoryLinksEditor config={c} set={set} />;

    case 'product_carousel':
      return (
        <div className="builder-panel-content">
          <Card title="Content">
            <Field label="Section Title">
              <input className="form-input" value={c.title || ''} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <Field label="Collection Slug or ID">
                <input className="form-input" value={c.collectionId || ''} onChange={(e) => set('collectionId', e.target.value)} placeholder="e.g. best-sellers" />
              </Field>
              <Field label="Limit">
                <input className="form-input" type="number" value={c.limit || 10} onChange={(e) => set('limit', Number(e.target.value))} />
              </Field>
            </div>
          </Card>
          <Card title="Call to Action" desc="Optional CTA shown below the carousel.">
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="CTA Text">
                <input className="form-input" value={c.ctaText || ''} onChange={(e) => set('ctaText', e.target.value)} />
              </Field>
              <Field label="CTA Link">
                <input className="form-input" value={c.ctaLink || ''} onChange={(e) => set('ctaLink', e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>
      );

    case 'featured_product':
      return (
        <div className="builder-panel-content">
          <Card title="Product" desc="Copy the product ID from the product editor URL.">
            <Field label="Product ID">
              <input className="form-input" value={c.productId || ''} onChange={(e) => set('productId', e.target.value)}
                placeholder="Paste product ID" />
            </Field>
          </Card>
        </div>
      );

    case 'spacer':
      return (
        <div className="builder-panel-content">
          <Card title="Spacing">
            <Field label="Height (px)">
              <input className="form-input" type="number" value={c.height || 40} min="8" max="200"
                onChange={(e) => set('height', Number(e.target.value))} />
            </Field>
          </Card>
        </div>
      );

    case 'divider':
      return (
        <div className="builder-panel-content">
          <Card title="Divider Style">
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Width">
                <select className="form-input" value={c.width || 'standard'} onChange={(e) => set('width', e.target.value)}>
                  <option value="standard">Standard</option>
                  <option value="full">Full Viewport</option>
                </select>
              </Field>
              <Field label="Style">
                <select className="form-input" value={c.style || 'solid'} onChange={(e) => set('style', e.target.value)}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </Field>
            </div>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Thickness (px)">
                <input className="form-input" type="number" value={c.thickness || 1} min="1" max="10"
                  onChange={(e) => set('thickness', Number(e.target.value))} />
              </Field>
              <Field label="">
                <div style={{ height: '1.25rem' }} />
                <InlineColor label="Colour" value={c.color || '#e5e7eb'} onChange={(val) => set('color', val)} />
              </Field>
            </div>
          </Card>
        </div>
      );

    case 'video':
      return <VideoBlockEditor config={c} set={set} />;

    case 'banner':
      return <BannerEditor config={c} set={set} />;

    case 'ticker':
      return (
        <div className="builder-panel-content">
          <Card title="Content">
            <Field label="Ticker Text">
              <input className="form-input" value={c.text || ''} onChange={(e) => set('text', e.target.value)} placeholder="📢 FREE SHIPPING ON ALL ORDERS" />
            </Field>
            <Field label="Scroll Speed (seconds)">
              <input type="number" className="form-input" value={c.speed || 30} onChange={(e) => set('speed', Number(e.target.value))} />
            </Field>
          </Card>
          <Card title="Colours">
            <InlineColor label="Background" value={c.bgColor || '#000000'} onChange={(val) => set('bgColor', val)} />
            <InlineColor label="Text" value={c.textColor || '#ffffff'} onChange={(val) => set('textColor', val)} />
          </Card>
        </div>
      );

    case 'features':
      return (
        <div className="builder-panel-content">
          <Card title="Features">
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
                <div className="form-group">
                  <label className="form-label">Icon name (Lucide)</label>
                  <input className="form-input" value={item.icon || 'star'} onChange={(e) => {
                    const items = [...(c.items || [])];
                    items[i] = { ...item, icon: e.target.value };
                    set('items', items);
                  }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" value={item.title || ''} onChange={(e) => {
                    const items = [...(c.items || [])];
                    items[i] = { ...item, title: e.target.value };
                    set('items', items);
                  }} />
                </div>
                <div className="form-group">
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
          </Card>
        </div>
      );

    case 'testimonials':
      return (
        <div className="builder-panel-content">
          <Card title="Testimonials">
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
          </Card>
        </div>
      );

    case 'faq':
      return (
        <div className="builder-panel-content">
          <Card title="Questions">
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
          </Card>
        </div>
      );

    case 'custom_html':
      return (
        <div className="builder-panel-content">
          <Card title="Custom HTML" desc="Paste your own HTML code.">
            <Field label="HTML">
              <textarea className="form-input form-textarea" rows={8} value={c.html || ''}
                onChange={(e) => set('html', e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }} />
            </Field>
          </Card>
        </div>
      );

    case 'container':
      return (
        <div className="builder-panel-content">
          <Card title="Container Style">
            <InlineColor label="Background Colour" value={c.bgColor || 'transparent'} onChange={(val) => set('bgColor', val)} />
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Padding">
                <input className="form-input" value={c.padding || '40px'} onChange={(e) => set('padding', e.target.value)} placeholder="40px" />
              </Field>
              <Field label="Max Width">
                <input className="form-input" value={c.maxWidth || '1200px'} onChange={(e) => set('maxWidth', e.target.value)} placeholder="1200px" />
              </Field>
            </div>
          </Card>
          <Card title="Border">
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Border Width">
                <input className="form-input" type="number" value={c.borderWidth || 0} min="0" max="20" onChange={(e) => set('borderWidth', Number(e.target.value))} />
              </Field>
              <Field label="Border Radius">
                <input className="form-input" type="number" value={c.borderRadius || 0} min="0" max="50" onChange={(e) => set('borderRadius', Number(e.target.value))} />
              </Field>
            </div>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Border Style">
                <select className="form-input" value={c.borderStyle || 'solid'} onChange={(e) => set('borderStyle', e.target.value)}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </Field>
              <Field label="">
                <div style={{ height: '1.25rem' }} />
                <InlineColor label="Border Colour" value={c.borderColor || '#e5e7eb'} onChange={(val) => set('borderColor', val)} />
              </Field>
            </div>
          </Card>
          <Card title="Spacing">
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Margin Top">
                <input className="form-input" value={c.marginTop || '0px'} onChange={(e) => set('marginTop', e.target.value)} placeholder="0px" />
              </Field>
              <Field label="Margin Bottom">
                <input className="form-input" value={c.marginBottom || '0px'} onChange={(e) => set('marginBottom', e.target.value)} placeholder="0px" />
              </Field>
            </div>
            <Field label="Gap Between Blocks">
              <input className="form-input" type="number" value={c.gap || 0} min="0" max="100" onChange={(e) => set('gap', Number(e.target.value))} />
            </Field>
          </Card>
          <Card title="Effects">
            <Field label="">
              <label className="pb-checkbox">
                <input type="checkbox" checked={c.shadow ?? false} onChange={(e) => set('shadow', e.target.checked)} />
                Enable box shadow
              </label>
            </Field>
            {c.shadow && (
              <Field label="Shadow">
                <input className="form-input" value={c.shadowValue || '0 4px 24px rgba(0,0,0,0.08)'} onChange={(e) => set('shadowValue', e.target.value)} placeholder="0 4px 24px rgba(0,0,0,0.08)" />
              </Field>
            )}
            <Field label="Overflow">
              <select className="form-input" value={c.overflow || 'visible'} onChange={(e) => set('overflow', e.target.value)}>
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
              </select>
            </Field>
          </Card>
        </div>
      );

    case 'columns':
      const cols = (c.columns || []).map((col: any) => Array.isArray(col) ? { blocks: col } : col);
      const selectedCol = editingColumnIndex != null ? cols[editingColumnIndex] : null;
      const selectedColBlocks: PageBlock[] = selectedCol?.blocks || [];
      return (
        <div className="builder-panel-content">
          <Card title="Layout">
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Columns">
                <select className="form-input" value={cols.length} onChange={(e) => {
                  const len = Number(e.target.value);
                  const newCols = [...cols];
                  if (len > newCols.length) {
                    while (newCols.length < len) newCols.push({ blocks: [] });
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
            </div>
            <Field label="">
              <label className="pb-checkbox">
                <input type="checkbox" checked={c.stackOnMobile ?? true} onChange={(e) => set('stackOnMobile', e.target.checked)} />
                Stack columns on mobile
              </label>
            </Field>
          </Card>

          {editingColumnIndex != null && selectedCol ? (
            <>
              <Card title={`Column ${editingColumnIndex + 1} Style`} desc="Click a column on the canvas to select it.">
                <InlineColor label="Background" value={selectedCol.bgColor || 'transparent'} onChange={(val) => onColumnStyleChange?.({ bgColor: val })} />
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Field label="Border Width">
                    <input className="form-input" type="number" value={selectedCol.borderWidth || 0} min="0" max="20" onChange={(e) => onColumnStyleChange?.({ borderWidth: Number(e.target.value) })} />
                  </Field>
                  <Field label="Border Radius">
                    <input className="form-input" type="number" value={selectedCol.borderRadius || 0} min="0" max="50" onChange={(e) => onColumnStyleChange?.({ borderRadius: Number(e.target.value) })} />
                  </Field>
                </div>
                <InlineColor label="Border Colour" value={selectedCol.borderColor || '#e5e7eb'} onChange={(val) => onColumnStyleChange?.({ borderColor: val })} />
                <Field label="Padding">
                  <input className="form-input" value={selectedCol.padding || ''} onChange={(e) => onColumnStyleChange?.({ padding: e.target.value })} placeholder="e.g. 16px or 12px 20px" />
                </Field>
              </Card>

              {selectedColBlocks.length > 0 && (
                <Card title={`Blocks in Column ${editingColumnIndex + 1}`}>
                  {selectedColBlocks.map((sb: PageBlock) => (
                    <div key={sb.id} className="ub-settings-item-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.75rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 500, textTransform: 'capitalize' }}>{sb.type.replace('_', ' ')}</span>
                      <button className="btn btn-ghost btn-icon-sm danger" onClick={() => onRemoveSubBlock?.(sb.id)}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </Card>
              )}
            </>
          ) : (
            <div className="ub-settings-card" style={{ background: 'var(--surface-50)', border: '1px dashed var(--border-color)' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0, padding: '1rem' }}>
                Click a column on the canvas to customise its style and manage its blocks.
              </p>
            </div>
          )}
        </div>
      );

    default:
      return <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>No settings available for this block type.</p>;
  }
}

/* ─── Card wrapper ─────────────────────────────── */
function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="ub-settings-card">
      <div className="ub-settings-card-header">
        <h3 className="ub-settings-card-title">{title}</h3>
        {desc && <p className="ub-settings-card-desc">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

/* ─── Inline colour row (label + picker side-by-side) ─── */
function InlineColor({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="form-group color-field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <label className="form-label" style={{ margin: 0 }}>{label}</label>
      <div className="color-input-wrap">
        <ColorPicker value={value} onChange={onChange} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      {children}
    </div>
  );
}

/* ─── Block-level Font Picker (reusable) ─── */
const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Outfit', 'Raleway', 'Nunito', 'Playfair Display', 'Oswald',
  'Source Sans 3', 'DM Sans', 'Space Grotesk', 'Manrope', 'Sora',
];

const _loadedFonts = new Set<string>();
function loadGoogleFont(name: string) {
  if (!name || _loadedFonts.has(name)) return;
  _loadedFonts.add(name);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;600;700;900&display=swap`;
  document.head.appendChild(link);
}

function BlockFontPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (value) loadGoogleFont(value); }, [value]);
  useEffect(() => { if (open) setTimeout(() => searchRef.current?.focus(), 0); }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const filtered = GOOGLE_FONTS.filter(f => !search || f.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="form-group" style={{ position: 'relative' }} ref={ref}>
      <label className="form-label">{label}</label>
      <button type="button" className="form-input ub-font-picker-trigger" onClick={() => setOpen(!open)}>
        <span style={{ fontFamily: `'${value || 'inherit'}', sans-serif` }}>{value || 'Theme Default'}</span>
        <ChevronDown size={14} style={{ opacity: 0.45, flexShrink: 0 }} />
      </button>
      {open && (
        <div className="ub-font-dropdown">
          <div className="ub-font-search-wrap">
            <Search size={14} className="ub-font-search-icon" />
            <input ref={searchRef} className="form-input ub-font-search" placeholder="Search fonts…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="ub-font-list">
            <button type="button" className={`ub-font-item${!value ? ' active' : ''}`} onClick={() => { onChange(''); setOpen(false); setSearch(''); }}>
              Theme Default
            </button>
            {filtered.map(f => (
              <button type="button" key={f} className={`ub-font-item${value === f ? ' active' : ''}`}
                onClick={() => { loadGoogleFont(f); onChange(f); setOpen(false); setSearch(''); }}
                onMouseEnter={() => loadGoogleFont(f)}
                style={{ fontFamily: `'${f}', sans-serif` }}
              >
                {f}
              </button>
            ))}
            {filtered.length === 0 && <div className="ub-font-empty">No fonts match "{search}"</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Half Hero Editor ─────────────────────────── */
function HalfHeroEditor({ config: c, set }: { config: Record<string, any>; set: (key: string, value: any) => void }) {
  const [uploading, setUploading] = useState(false);
  const bgMode = c.bgMode || 'image';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `hero-images/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('store-assets').getPublicUrl(fileName);
      set('imageUrl', publicUrl);
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="builder-panel-content">
      {/* Background Card */}
      <Card title="Background">
        <Field label="Background Mode">
          <select className="form-input" value={bgMode} onChange={(e) => set('bgMode', e.target.value)}>
            <option value="image">Image</option>
            <option value="colour">Solid Colour</option>
          </select>
        </Field>

        {bgMode === 'image' ? (
          <>
            <div className="form-group">
              <label className="form-label" style={{ marginBottom: 8 }}>Hero Image</label>
              <label className="ub-logo-upload-zone">
                {c.imageUrl ? (
                  <>
                    <img src={c.imageUrl} alt="Hero" style={{ display: 'block', height: 80, width: 'auto', maxWidth: '100%', objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
                    <span className="ub-upload-replace">{uploading ? 'Uploading...' : 'Click to replace image'}</span>
                  </>
                ) : (
                  <>
                    <Upload size={24} color="var(--text-tertiary)" />
                    <span className="ub-upload-title">{uploading ? 'Uploading...' : 'Upload hero image'}</span>
                    <span className="ub-upload-hint">Supports PNG, JPG, or WebP</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
              </label>
              {c.imageUrl && (
                <button className="btn btn-ghost danger btn-sm" style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }} onClick={() => set('imageUrl', '')}>Remove Image</button>
              )}
            </div>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Image Position">
                <select className="form-input" value={c.objectPosition || 'center'} onChange={(e) => set('objectPosition', e.target.value)}>
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </Field>
              <Field label="Image Opacity">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input type="range" min="0" max="1" step="0.05" value={c.imageOpacity ?? 0.85} style={{ flex: 1 }}
                    onChange={(e) => set('imageOpacity', Number(e.target.value))} />
                  <span className="pb-range-val">{Math.round((c.imageOpacity ?? 0.85) * 100)}%</span>
                </div>
              </Field>
            </div>

            <InlineColor label="Overlay Colour" value={c.overlayColor || '#000000'} onChange={(val) => set('overlayColor', val)} />
            <Field label="Overlay Opacity">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input type="range" min="0" max="1" step="0.05" value={c.overlayOpacity ?? 0} style={{ flex: 1 }}
                  onChange={(e) => set('overlayOpacity', Number(e.target.value))} />
                <span className="pb-range-val">{Math.round((c.overlayOpacity ?? 0) * 100)}%</span>
              </div>
            </Field>
          </>
        ) : (
          <InlineColor label="Background Colour" value={c.bgColor || '#1e293b'} onChange={(val) => set('bgColor', val)} />
        )}

        <Field label="Height">
          <input className="form-input" value={c.height || '600px'} onChange={(e) => set('height', e.target.value)} placeholder="600px" />
        </Field>
      </Card>

      {/* Content Card */}
      <Card title="Content" desc="Text overlay on the hero.">
        <Field label="Title">
          <input className="form-input" value={c.title || ''} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <BlockFontPicker label="Title Font" value={c.titleFont || ''} onChange={(v) => set('titleFont', v)} />
          <Field label="Size (px)">
            <input className="form-input" type="number" value={c.titleFontSize ?? 56} min="10" max="150" onChange={(e) => set('titleFontSize', Number(e.target.value))} />
          </Field>
        </div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Font Weight">
            <select className="form-input" value={c.titleFontWeight || '900'} onChange={(e) => set('titleFontWeight', e.target.value)}>
              <option value="400">Regular (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">Semi-Bold (600)</option>
              <option value="700">Bold (700)</option>
              <option value="800">Extra-Bold (800)</option>
              <option value="900">Black (900)</option>
            </select>
          </Field>
          <Field label="">
            <div style={{ height: '1.25rem' }} />
            <InlineColor label="Title Colour" value={c.titleColor || '#ffffff'} onChange={(val) => set('titleColor', val)} />
          </Field>
        </div>

        <Field label="Subtitle">
          <input className="form-input" value={c.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} placeholder="Optional descriptive text" />
        </Field>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Size (px)">
            <input className="form-input" type="number" value={c.subtitleFontSize ?? 18} min="10" max="100" onChange={(e) => set('subtitleFontSize', Number(e.target.value))} />
          </Field>
          <Field label="">
            <div style={{ height: '1.25rem' }} />
            <InlineColor label="Subtitle Colour" value={c.subtitleColor || '#ffffff'} onChange={(val) => set('subtitleColor', val)} />
          </Field>
        </div>
      </Card>

      {/* Card Styling */}
      <Card title="Card Style" desc="The content card that holds your text.">
        <InlineColor label="Card Background" value={c.cardBgColor || '#000000'} onChange={(val) => set('cardBgColor', val)} />
        <Field label="Card Opacity">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="range" min="0" max="1" step="0.05" value={c.cardBgOpacity ?? 0.4} style={{ flex: 1 }}
              onChange={(e) => set('cardBgOpacity', Number(e.target.value))} />
            <span className="pb-range-val">{Math.round((c.cardBgOpacity ?? 0.4) * 100)}%</span>
          </div>
        </Field>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Border Radius">
            <input className="form-input" type="number" value={c.cardRadius ?? 12} min="0" max="50"
              onChange={(e) => set('cardRadius', Number(e.target.value))} />
          </Field>
          <Field label="Blur Amount">
            <input className="form-input" type="number" value={c.cardBlurAmount ?? 10} min="0" max="30"
              onChange={(e) => set('cardBlurAmount', Number(e.target.value))} />
          </Field>
        </div>
        <Field label="">
          <label className="pb-checkbox">
            <input type="checkbox" checked={c.cardBlur !== false} onChange={(e) => set('cardBlur', e.target.checked)} />
            Enable backdrop blur
          </label>
        </Field>
      </Card>

      {/* CTA Button */}
      <Card title="CTA Button">
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Button Text">
            <input className="form-input" value={c.ctaText || ''} onChange={(e) => set('ctaText', e.target.value)} />
          </Field>
          <Field label="Button Link">
            <input className="form-input" value={c.ctaLink || ''} onChange={(e) => set('ctaLink', e.target.value)} placeholder="/shop" />
          </Field>
        </div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <InlineColor label="Button BG" value={c.ctaBgColor || ''} onChange={(val) => set('ctaBgColor', val)} />
          <InlineColor label="Button Text" value={c.ctaTextColor || '#ffffff'} onChange={(val) => set('ctaTextColor', val)} />
        </div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Font Size (px)">
            <input className="form-input" type="number" value={c.ctaFontSize ?? 16} min="10" max="60" onChange={(e) => set('ctaFontSize', Number(e.target.value))} />
          </Field>
          <Field label="Border Radius">
            <input className="form-input" type="number" value={c.ctaRadius ?? 8} min="0" max="50"
              onChange={(e) => set('ctaRadius', Number(e.target.value))} />
          </Field>
        </div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Padding Size">
            <select className="form-input" value={c.ctaSize || 'md'} onChange={(e) => set('ctaSize', e.target.value)}>
              <option value="sm">Small (Compact)</option>
              <option value="md">Medium (Standard)</option>
              <option value="lg">Large (Spaced)</option>
            </select>
          </Field>
          <div />
        </div>
      </Card>
    </div>
  );
}

/* ─── Hero Banner Editor ─────────────────────────── */
function HeroBannerEditor({ config: c, set }: { config: Record<string, any>; set: (key: string, value: any) => void }) {
  const [uploading, setUploading] = useState(false);
  const bgMode = c.bgMode || 'image';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `hero-images/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('store-assets').getPublicUrl(fileName);
      set('imageUrl', publicUrl);
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="builder-panel-content">
      {/* Background Card */}
      <Card title="Background">
        <Field label="Background Mode">
          <select className="form-input" value={bgMode} onChange={(e) => set('bgMode', e.target.value)}>
            <option value="image">Image</option>
            <option value="colour">Solid Colour</option>
          </select>
        </Field>

        {bgMode === 'image' ? (
          <>
            <div className="form-group">
              <label className="form-label" style={{ marginBottom: 8 }}>Hero Image</label>
              <label className="ub-logo-upload-zone">
                {c.imageUrl ? (
                  <>
                    <img src={c.imageUrl} alt="Hero" style={{ display: 'block', height: 80, width: 'auto', maxWidth: '100%', objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
                    <span className="ub-upload-replace">{uploading ? 'Uploading...' : 'Click to replace image'}</span>
                  </>
                ) : (
                  <>
                    <Upload size={24} color="var(--text-tertiary)" />
                    <span className="ub-upload-title">{uploading ? 'Uploading...' : 'Upload hero image'}</span>
                    <span className="ub-upload-hint">Supports PNG, JPG, or WebP</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
              </label>
              {c.imageUrl && (
                <button className="btn btn-ghost danger btn-sm" style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }} onClick={() => set('imageUrl', '')}>Remove Image</button>
              )}
            </div>
          </>
        ) : (
          <InlineColor label="Background Colour" value={c.bgColor || '#1e293b'} onChange={(val) => set('bgColor', val)} />
        )}

        <InlineColor label="Overlay Colour" value={c.overlayColor || '#000000'} onChange={(val) => set('overlayColor', val)} />
        <Field label="Overlay Opacity">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="range" min="0" max="1" step="0.05" value={c.overlayOpacity ?? 0.4} style={{ flex: 1 }}
              onChange={(e) => set('overlayOpacity', Number(e.target.value))} />
            <span className="pb-range-val">{Math.round((c.overlayOpacity ?? 0.4) * 100)}%</span>
          </div>
        </Field>

        <Field label="Min Height">
          <input className="form-input" value={c.height || '600px'} onChange={(e) => set('height', e.target.value)} placeholder="600px" />
        </Field>
      </Card>

      {/* Content Card */}
      <Card title="Content">
        <Field label="Title">
          <input className="form-input" value={c.title || ''} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <BlockFontPicker label="Title Font" value={c.titleFont || ''} onChange={(v) => set('titleFont', v)} />
          <Field label="Size (px)">
            <input className="form-input" type="number" value={c.titleFontSize ?? 56} min="10" max="150" onChange={(e) => set('titleFontSize', Number(e.target.value))} />
          </Field>
        </div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Font Weight">
            <select className="form-input" value={c.titleFontWeight || '900'} onChange={(e) => set('titleFontWeight', e.target.value)}>
              <option value="400">Regular (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">Semi-Bold (600)</option>
              <option value="700">Bold (700)</option>
              <option value="800">Extra-Bold (800)</option>
              <option value="900">Black (900)</option>
            </select>
          </Field>
          <Field label="">
            <div style={{ height: '1.25rem' }} />
            <InlineColor label="Title Colour" value={c.titleColor || '#ffffff'} onChange={(val) => set('titleColor', val)} />
          </Field>
        </div>

        <Field label="Subtitle">
          <input className="form-input" value={c.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} />
        </Field>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Size (px)">
            <input className="form-input" type="number" value={c.subtitleFontSize ?? 18} min="10" max="100" onChange={(e) => set('subtitleFontSize', Number(e.target.value))} />
          </Field>
          <Field label="">
            <div style={{ height: '1.25rem' }} />
            <InlineColor label="Subtitle Colour" value={c.subtitleColor || '#ffffff'} onChange={(val) => set('subtitleColor', val)} />
          </Field>
        </div>
      </Card>

      {/* Buttons Card */}
      <Card title="Buttons">
        <Field label="Button Spacing (px)">
          <input className="form-input" type="number" value={c.buttonSpacing ?? 16} min="0" max="60" onChange={(e) => set('buttonSpacing', Number(e.target.value))} />
        </Field>
        
        {(() => {
          // Fallback logic for old single CTA config structure
          const buttons = Array.isArray(c.buttons) ? c.buttons : (c.ctaText ? [{ text: c.ctaText, link: c.ctaLink, bgColor: c.ctaBgColor, textColor: c.ctaTextColor, radius: c.ctaRadius, size: c.ctaSize, fontSize: c.ctaFontSize }] : []);
          const updateBtn = (i: number, k: string, v: any) => {
            const nb = [...buttons];
            nb[i] = { ...nb[i], [k]: v };
            set('buttons', nb);
          };
          const addBtn = () => set('buttons', [...buttons, { text: 'New Button', link: '', bgColor: '', textColor: '#ffffff', radius: 99, size: 'md', fontSize: 16 }]);
          const rmBtn = (i: number) => set('buttons', buttons.filter((_, idx) => idx !== i));
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
              {buttons.map((btn: any, i: number) => (
                <div key={i} style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', position: 'relative' }}>
                  <button onClick={() => rmBtn(i)} className="btn btn-ghost danger btn-sm" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', padding: '0.25rem' }}>
                    <Trash2 size={14} />
                  </button>
                  <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem' }}>Button {i + 1}</div>
                  
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Field label="Text">
                      <input className="form-input" value={btn.text || ''} onChange={(e) => updateBtn(i, 'text', e.target.value)} />
                    </Field>
                    <Field label="Link">
                      <input className="form-input" value={btn.link || ''} onChange={(e) => updateBtn(i, 'link', e.target.value)} placeholder="/shop" />
                    </Field>
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <InlineColor label="Background" value={btn.bgColor || ''} onChange={(val) => updateBtn(i, 'bgColor', val)} />
                    <InlineColor label="Text Colour" value={btn.textColor || '#ffffff'} onChange={(val) => updateBtn(i, 'textColor', val)} />
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Field label="Font Size (px)">
                      <input className="form-input" type="number" value={btn.fontSize ?? 16} min="10" max="60" onChange={(e) => updateBtn(i, 'fontSize', Number(e.target.value))} />
                    </Field>
                    <Field label="Border Radius">
                      <input className="form-input" type="number" value={btn.radius ?? 99} min="0" max="99" onChange={(e) => updateBtn(i, 'radius', Number(e.target.value))} />
                    </Field>
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Field label="Padding Size">
                      <select className="form-input" value={btn.size || 'md'} onChange={(e) => updateBtn(i, 'size', e.target.value)}>
                        <option value="sm">Small</option>
                        <option value="md">Medium</option>
                        <option value="lg">Large</option>
                      </select>
                    </Field>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={addBtn}>+ Add Button</button>
            </div>
          );
        })()}
      </Card>
    </div>
  );
}

/* ─── Category Links Editor ────────────────────── */
function CategoryLinksEditor({ config: c, set }: { config: Record<string, any>; set: (key: string, value: any) => void }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const selectedIds = c.collectionIds || [];

  useEffect(() => {
    api.fetchCollections().then(setCollections).catch(console.error);
  }, []);

  const toggleCollection = (id: string, checked: boolean) => {
    if (checked) {
      set('collectionIds', [...selectedIds, id]);
    } else {
      set('collectionIds', selectedIds.filter((x: string) => x !== id));
    }
  };

  return (
    <div className="builder-panel-content">
      <Card title="Collections" desc="Select the collections to feature on the storefront.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {collections.map(col => (
            <label key={col.id} className="pb-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                checked={selectedIds.includes(col.id)} 
                onChange={(e) => toggleCollection(col.id, e.target.checked)} 
              />
              {col.name}
            </label>
          ))}
          {collections.length === 0 && <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Loading collections...</span>}
        </div>
      </Card>
      <Card title="Display Options">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Max Items">
            <input className="form-input" type="number" value={c.limit || 3} min={1} max={12} onChange={(e) => set('limit', Number(e.target.value))} />
          </Field>
          <Field label="Columns (Desktop)">
            <select className="form-input" value={c.columns || 3} onChange={(e) => set('columns', Number(e.target.value))}>
              {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Columns</option>)}
            </select>
          </Field>
          <Field label="Image Aspect Ratio">
            <select className="form-input" value={c.aspectRatio || 'auto'} onChange={(e) => set('aspectRatio', e.target.value)}>
              <option value="auto">Original (Auto)</option>
              <option value="square">Square (1:1)</option>
              <option value="portrait">Portrait (3:4)</option>
              <option value="landscape">Landscape (4:3)</option>
            </select>
          </Field>
          <Field label="Text Position">
            <select className="form-input" value={c.textPosition || 'below'} onChange={(e) => set('textPosition', e.target.value)}>
              <option value="below">Below Image</option>
              <option value="overlay">Overlay on Image</option>
            </select>
          </Field>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label className="ub-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={c.stackOnMobile ?? true} onChange={(e) => set('stackOnMobile', e.target.checked)} />
            <span style={{ fontSize: '0.8125rem' }}>Stack items vertically on mobile view</span>
          </label>
        </div>
      </Card>
      <Card title="Card Styling">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Background Color">
            <ColorPicker value={c.bgColor || ''} onChange={(val) => set('bgColor', val)} />
          </Field>
          <Field label="Border Color">
            <ColorPicker value={c.borderColor || ''} onChange={(val) => set('borderColor', val)} />
          </Field>
          <Field label="Border Radius (px)">
            <input className="form-input" type="number" value={c.borderRadius ?? 0} onChange={(e) => set('borderRadius', Number(e.target.value))} />
          </Field>
          <Field label="Hover Effect">
             <label className="ub-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '0.5rem' }}>
              <input type="checkbox" checked={c.hoverEffect ?? true} onChange={(e) => set('hoverEffect', e.target.checked)} />
              <span style={{ fontSize: '0.8125rem' }}>Elevate card on hover</span>
            </label>
          </Field>
        </div>
      </Card>
      <Card title="Text & Button Options">
        <Field label="Title Color">
          <ColorPicker value={c.titleColor || ''} onChange={(val) => set('titleColor', val)} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <Field label="Button Text">
            <input className="form-input" value={c.ctaText ?? 'SHOP NOW'} onChange={(e) => set('ctaText', e.target.value)} />
          </Field>
          <Field label="Button Style">
            <select className="form-input" value={c.ctaStyle || 'link'} onChange={(e) => set('ctaStyle', e.target.value)}>
              <option value="link">Text Link</option>
              <option value="primary">Primary Button</option>
              <option value="secondary">Secondary Button</option>
            </select>
          </Field>
          {c.ctaStyle && c.ctaStyle !== 'link' && (
             <Field label="Button Custom Color">
               <ColorPicker value={c.ctaColor || ''} onChange={(val) => set('ctaColor', val)} />
             </Field>
          )}
        </div>
      </Card>
      <Card title="Block Spacing">
        <div style={{ padding: '0.5rem 0', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Padding (Internal)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Field label="Top"><input type="number" className="form-input" value={c.paddingTop ?? ''} onChange={e => set('paddingTop', e.target.value === '' ? undefined : Number(e.target.value))} placeholder="0" /></Field>
          <Field label="Right"><input type="number" className="form-input" value={c.paddingRight ?? ''} onChange={e => set('paddingRight', e.target.value === '' ? undefined : Number(e.target.value))} placeholder="0" /></Field>
          <Field label="Bottom"><input type="number" className="form-input" value={c.paddingBottom ?? ''} onChange={e => set('paddingBottom', e.target.value === '' ? undefined : Number(e.target.value))} placeholder="0" /></Field>
          <Field label="Left"><input type="number" className="form-input" value={c.paddingLeft ?? ''} onChange={e => set('paddingLeft', e.target.value === '' ? undefined : Number(e.target.value))} placeholder="0" /></Field>
        </div>

        <div style={{ padding: '0.5rem 0', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Margin (External)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          <Field label="Top"><input type="number" className="form-input" value={c.marginTop ?? ''} onChange={e => set('marginTop', e.target.value === '' ? undefined : Number(e.target.value))} placeholder="0" /></Field>
          <Field label="Right"><input type="number" className="form-input" value={c.marginRight ?? ''} onChange={e => set('marginRight', e.target.value === '' ? undefined : Number(e.target.value))} placeholder="0" /></Field>
          <Field label="Bottom"><input type="number" className="form-input" value={c.marginBottom ?? ''} onChange={e => set('marginBottom', e.target.value === '' ? undefined : Number(e.target.value))} placeholder="4rem" /></Field>
          <Field label="Left"><input type="number" className="form-input" value={c.marginLeft ?? ''} onChange={e => set('marginLeft', e.target.value === '' ? undefined : Number(e.target.value))} placeholder="0" /></Field>
        </div>
      </Card>
    </div>
  );
}

/* ─── Banner Editor ────────────────────────────── */
function BannerEditor({ config: c, set }: { config: Record<string, any>; set: (key: string, value: any) => void }) {
  const [uploading, setUploading] = useState(false);
  const mode = c.mode || 'static';
  const bgMode = c.bgMode || 'colour';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `banner-images/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('store-assets').getPublicUrl(fileName);
      set('imageUrl', publicUrl);
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="builder-panel-content">
      <Card title="Content mode">
        <Field label="Display Mode">
          <select className="form-input" value={mode} onChange={(e) => set('mode', e.target.value)}>
            <option value="static">Static Text</option>
            <option value="ticker">Scrolling Ticker</option>
          </select>
        </Field>
      </Card>

      <Card title={mode === 'ticker' ? "Ticker Text" : "Banner Text"}>
        <Field label="Text">
          <input className="form-input" value={c.text || ''} onChange={(e) => set('text', e.target.value)} placeholder="Enter your message..." />
        </Field>
        {mode === 'ticker' && (
          <Field label="Scroll Speed (seconds)">
            <input type="number" className="form-input" value={c.speed || 30} onChange={(e) => set('speed', Number(e.target.value))} />
          </Field>
        )}
        {mode === 'static' && (
          <Field label="Alignment">
            <select className="form-input" value={c.align || 'center'} onChange={(e) => set('align', e.target.value)}>
              <option value="left">Left</option>
              <option value="center">Centre</option>
              <option value="right">Right</option>
            </select>
          </Field>
        )}
      </Card>

      <Card title="Typography">
        <BlockFontPicker label="Font Family" value={c.fontFamily || ''} onChange={(val) => set('fontFamily', val)} />
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <Field label="Font Size (px)">
            <input type="number" className="form-input" value={c.fontSize || ''} onChange={(e) => set('fontSize', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 16" />
          </Field>
          <Field label="Font Weight">
            <select className="form-input" value={c.fontWeight || 600} onChange={(e) => set('fontWeight', Number(e.target.value))}>
              <option value="400">Regular (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">Semi Bold (600)</option>
              <option value="700">Bold (700)</option>
              <option value="800">Extra Bold (800)</option>
              <option value="900">Black (900)</option>
            </select>
          </Field>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <InlineColor label="Text Colour" value={c.textColor || '#ffffff'} onChange={(val) => set('textColor', val)} />
        </div>
      </Card>

      <Card title="Background">
        <Field label="Background Mode">
          <select className="form-input" value={bgMode} onChange={(e) => set('bgMode', e.target.value)}>
            <option value="colour">Solid Colour</option>
            <option value="image">Image with Overlay</option>
          </select>
        </Field>

        {bgMode === 'image' && (
          <>
            <Field label="Background Image">
              {c.imageUrl ? (
                <div style={{ marginBottom: '0.5rem', position: 'relative', borderRadius: '4px', overflow: 'hidden', height: '80px' }}>
                  <img src={c.imageUrl} alt="Bg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button className="btn btn-ghost btn-icon-sm danger" onClick={() => set('imageUrl', '')}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: '#fff' }}>✕</button>
                </div>
              ) : (
                <label className="btn btn-secondary btn-sm" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', cursor: uploading ? 'wait' : 'pointer' }}>
                  <Upload size={14} />
                  {uploading ? 'Uploading...' : 'Upload Image'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} disabled={uploading} />
                </label>
              )}
            </Field>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <Field label="Aspect Ratio">
                <select className="form-input" value={c.aspectRatio || 'auto'} onChange={(e) => set('aspectRatio', e.target.value)}>
                  <option value="auto">Auto</option>
                  <option value="narrow">Narrow (Padding)</option>
                  <option value="wide">Wide (Padding)</option>
                </select>
              </Field>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <InlineColor label="Overlay Colour" value={c.overlayColor || '#000000'} onChange={(val) => set('overlayColor', val)} />
            </div>
            <Field label={`Overlay Opacity: ${c.overlayOpacity ?? 0.5}`}>
              <input type="range" className="form-range" min="0" max="1" step="0.05" value={c.overlayOpacity ?? 0.5}
                onChange={(e) => set('overlayOpacity', Number(e.target.value))} />
            </Field>
          </>
        )}

        {bgMode === 'colour' && (
          <div style={{ marginTop: '1rem' }}>
            <InlineColor label="Background Colour" value={c.bgColor || '#1a1a2e'} onChange={(val) => set('bgColor', val)} />
          </div>
        )}
      </Card>

      <Card title="Border & Layout">
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Border Width (px)">
            <input type="number" className="form-input" value={c.borderWidth || 0} min="0" max="20" onChange={(e) => set('borderWidth', Number(e.target.value))} />
          </Field>
          <Field label="Border Radius (px)">
            <input type="number" className="form-input" value={c.borderRadius || 0} min="0" max="50" onChange={(e) => set('borderRadius', Number(e.target.value))} />
          </Field>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <InlineColor label="Border Colour" value={c.borderColor || '#e5e7eb'} onChange={(val) => set('borderColor', val)} />
        </div>
      </Card>
      
      <Card title="Spacing">
         <Field label="Top Padding (px)">
           <input type="number" className="form-input" value={c.paddingTop ?? 16} min="0" max="100" onChange={(e) => set('paddingTop', Number(e.target.value))} />
         </Field>
         <Field label="Bottom Padding (px)">
           <input type="number" className="form-input" value={c.paddingBottom ?? 16} min="0" max="100" onChange={(e) => set('paddingBottom', Number(e.target.value))} />
         </Field>
      </Card>
    </div>
  );
}

/* ─── Image Block Editor ───────────────────────── */
function ImageBlockEditor({ config: c, set }: { config: Record<string, any>; set: (key: string, value: any) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `store-images/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('store-assets').getPublicUrl(fileName);
      set('url', publicUrl);
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="builder-panel-content">
      <Card title="Image Source">
        <div className="form-group">
          <label className="form-label" style={{ marginBottom: 8 }}>Upload Image</label>
          <label className="ub-logo-upload-zone">
            {c.url ? (
              <>
                <img src={c.url} alt="Uploaded" style={{ display: 'block', height: 80, width: 'auto', maxWidth: '100%', objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
                <span className="ub-upload-replace">{uploading ? 'Uploading...' : 'Click to replace image'}</span>
              </>
            ) : (
              <>
                <Upload size={24} color="var(--text-tertiary)" />
                <span className="ub-upload-title">{uploading ? 'Uploading...' : 'Upload image'}</span>
                <span className="ub-upload-hint">Supports PNG, JPG, or WebP</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
          </label>
          {c.url && (
            <button className="btn btn-ghost danger btn-sm" style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }} onClick={() => set('url', '')}>Remove Image</button>
          )}
        </div>
        <Field label="Alt Text (SEO & Accessibility)">
          <input className="form-input" value={c.alt || ''} onChange={(e) => set('alt', e.target.value)} placeholder="Description of image..." />
        </Field>
      </Card>
      
      <Card title="Action">
        <Field label="Link (Optional)">
          <input className="form-input" value={c.link || ''} onChange={(e) => set('link', e.target.value)} placeholder="/shop or https://..." />
        </Field>
      </Card>
      
      <Card title="Style">
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Width">
            <select className="form-input" value={c.width || '100%'} onChange={(e) => set('width', e.target.value)}>
              <option value="100%">100% (Full Width)</option>
              <option value="75%">75% Width</option>
              <option value="50%">50% Width</option>
              <option value="25%">25% Width</option>
              <option value="auto">Auto (Natural Size)</option>
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
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Radius (px)">
            <input className="form-input" type="number" value={c.borderRadius || ''} min="0" max="100"
              onChange={(e) => set('borderRadius', e.target.value ? Number(e.target.value) : '')} placeholder="e.g. 12" />
          </Field>
          <Field label="Shadow">
            <select className="form-input" value={c.shadow || 'none'} onChange={(e) => set('shadow', e.target.value)}>
              <option value="none">None</option>
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </Field>
        </div>
        <Field label="Opacity (%)">
          <input className="form-input" type="number" value={c.opacity ?? 100} min="0" max="100"
            onChange={(e) => set('opacity', e.target.value ? Number(e.target.value) : 100)} />
        </Field>
      </Card>
    </div>
  );
}

/* ─── Image Gallery Editor ───────────────────────── */
function ImageGalleryEditor({ config: c, set }: { config: Record<string, any>; set: (key: string, value: any) => void }) {
  const [uploading, setUploading] = useState(false);
  const images: string[] = Array.isArray(c.images) ? c.images : [];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const fileName = `store-images/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('store-assets').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('store-assets').getPublicUrl(fileName);
        newUrls.push(publicUrl);
      }
      set('images', [...images, ...newUrls]);
    } catch (err) {
      console.error('Image gallery upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const next = [...images];
    next.splice(index, 1);
    set('images', next);
  };

  return (
    <div className="builder-panel-content">
      <Card title="Gallery Images">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
          {images.map((url, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1/1' }}>
              <img src={url} alt={`Gallery ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
              <button
                className="btn btn-icon-sm danger"
                style={{ position: 'absolute', top: 4, right: 4, padding: 4, background: 'rgba(255,0,0,0.8)', color: 'white', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
                onClick={() => removeImage(i)}
                title="Remove image"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        
        <label className="btn btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
          <Upload size={16} style={{ marginRight: '0.5rem' }} /> {uploading ? 'Uploading...' : 'Add Images'}
          <input type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
        </label>
      </Card>

      <Card title="Layout">
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Layout Mode">
            <select className="form-input" value={c.layout || 'grid'} onChange={(e) => set('layout', e.target.value)}>
              <option value="grid">Grid (Uniform)</option>
              <option value="masonry">Masonry (Staggered)</option>
              <option value="bento">Bento (Dynamic Spans)</option>
            </select>
          </Field>
          <Field label="Columns">
            <select className="form-input" value={c.columns || 3} onChange={(e) => set('columns', Number(e.target.value))}>
              <option value="2">2 Columns</option>
              <option value="3">3 Columns</option>
              <option value="4">4 Columns</option>
            </select>
          </Field>
        </div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Aspect Ratio">
            <select className="form-input" value={c.aspectRatio || 'square'} onChange={(e) => set('aspectRatio', e.target.value)}>
              <option value="square">Square (1:1)</option>
              <option value="landscape">Landscape (4:3)</option>
              <option value="portrait">Portrait (3:4)</option>
              <option value="auto">Auto (Original)</option>
            </select>
          </Field>
          <Field label="Gap (px)">
            <input className="form-input" type="number" value={c.gap ?? 16} min="0" max="64"
              onChange={(e) => set('gap', Number(e.target.value))} />
          </Field>
        </div>
      </Card>

      <Card title="Style">
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Radius (px)">
            <input className="form-input" type="number" value={c.borderRadius || ''} min="0" max="100"
              onChange={(e) => set('borderRadius', e.target.value ? Number(e.target.value) : '')} placeholder="0" />
          </Field>
          <Field label="Shadow">
            <select className="form-input" value={c.shadow || 'none'} onChange={(e) => set('shadow', e.target.value)}>
              <option value="none">None</option>
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </Field>
        </div>
      </Card>
    </div>
  );
}

/* ─── Video Block Editor ───────────────────────── */
function VideoBlockEditor({ config: c, set }: { config: Record<string, any>; set: (key: string, value: any) => void }) {
  const [uploading, setUploading] = useState(false);
  const source = c.source || 'url';

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024 * 1024) {
      alert("This video is larger than 500MB. Please compress the file.");
      return;
    }

    setUploading(true);
    console.log('[VideoUploader] Starting upload sequence...', file.name, file.size, file.type);
    
    try {
      const ext = file.name.split('.').pop();
      const fileName = `store-videos/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      
      console.log(`[VideoUploader] Connecting to Supabase storage to upload: ${fileName}`);
      const res = await supabase.storage.from('store-assets').upload(fileName, file, { 
        upsert: true,
        contentType: file.type 
      });
      console.log('[VideoUploader] Supabase responded:', res);
      
      if (res.error) throw res.error;
      
      const { data: { publicUrl } } = supabase.storage.from('store-assets').getPublicUrl(fileName);
      console.log('[VideoUploader] Generated public URL:', publicUrl);
      
      set('url', publicUrl);
      console.log('[VideoUploader] Builder configuration updated successfully.');
    } catch (err: any) {
      console.error('[VideoUploader] Critical Exception Caught:', err);
      alert('Video Upload failed. Open your browser console (Cmd+Option+J) to see the exact error network reasons.');
    } finally {
      console.log('[VideoUploader] Upload sequence resolving cleanly.');
      setUploading(false);
      // Prevent browser holding the stale file in memory
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="builder-panel-content">
      <Card title="Video Source">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button className={`btn ${source === 'url' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => set('source', 'url')}>URL / YouTube</button>
          <button className={`btn ${source === 'upload' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => set('source', 'upload')}>Direct Upload</button>
        </div>

        {source === 'url' ? (
          <Field label="Video URL">
            <input className="form-input" value={c.url || ''} onChange={(e) => set('url', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          </Field>
        ) : (
          <div className="form-group">
            <label className="form-label" style={{ marginBottom: 8 }}>Upload MP4 or WebM Video</label>
            <label className="ub-logo-upload-zone" style={{ cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
              {c.url && source === 'upload' && !uploading ? (
                <>
                  <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, width: 140, marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 500 }}>Video File Loaded</span>
                  </div>
                  <span className="ub-upload-replace">Click to replace video</span>
                </>
              ) : uploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0' }}>
                  <style>
                    {`@keyframes ub-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
                  </style>
                  <Loader2 size={32} color="#ef4444" style={{ animation: 'ub-spin 1s linear infinite' }} />
                  <span className="ub-upload-title" style={{ color: '#ef4444', marginTop: '1rem', fontWeight: 600 }}>Uploading...</span>
                </div>
              ) : (
                <>
                  <Upload size={24} color="var(--text-tertiary)" />
                  <span className="ub-upload-title">Upload Video File</span>
                  <span className="ub-upload-hint">Supports MP4, WebM up to 500MB</span>
                </>
              )}
              <input type="file" accept="video/mp4,video/webm" onChange={handleVideoUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>
            {c.url && source === 'upload' && !uploading && (
              <button className="btn btn-ghost danger btn-sm" style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }} onClick={() => set('url', '')}>Remove Video</button>
            )}
          </div>
        )}
      </Card>

      <Card title="Playback Controls">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label className="pb-checkbox">
            <input type="checkbox" checked={c.autoplay || false} onChange={(e) => set('autoplay', e.target.checked)} />
            Autoplay Video
          </label>
          <label className="pb-checkbox">
            <input type="checkbox" checked={c.muted ?? false} onChange={(e) => set('muted', e.target.checked)} />
            Start Muted
          </label>
          <label className="pb-checkbox">
            <input type="checkbox" checked={c.controls ?? true} onChange={(e) => set('controls', e.target.checked)} />
            Show Custom Controls
          </label>
        </div>
        <p className="form-hint" style={{ marginTop: '1.2rem', marginBottom: 0, fontSize: 12 }}>
          <strong>Note:</strong> Browsers require videos to be muted for autoplay to natively trigger across devices.
        </p>
      </Card>
    </div>
  );
}

