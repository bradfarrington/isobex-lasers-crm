import { useState, useRef, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import { ArrowLeft, Trash2, Image as ImageIcon, X, Tag } from 'lucide-react';
import { BLOCK_TYPE_MAP, QUILL_FULL, QUILL_HEADING, QUILL_FORMATS, MERGE_TAGS, BRAND, tagLabel } from './constants';
import type { BlockData } from './constants';
import { ColorField, AlignField, FontPicker, ImageUploadButton, MergeTagInsert, BlockSpacing } from './components';

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
            <div className="eb-quill-wrap"><ReactQuill theme="snow" value={block.data.content || ''} onChange={v => patch('content', v)} modules={QUILL_HEADING} formats={QUILL_FORMATS} placeholder="Heading…" /></div>
          </div>
          <div className="form-group"><label>Level</label>
            <select className="form-select" value={block.data.level || 'h2'} onChange={e => patch('level', e.target.value)}>
              <option value="h1">H1 — Large</option><option value="h2">H2 — Medium</option><option value="h3">H3 — Small</option>
            </select>
          </div>
          <FontPicker value={block.data.fontFamily || ''} onChange={v => patch('fontFamily', v)} />
          <ColorField label="Text Colour" value={block.data.color} onChange={v => patch('color', v)} defaultValue="#1f2937" />
        </>)}

        {/* ── Text ── */}
        {block.type === 'text' && (<>
          <div className="form-group"><label>Content</label>
            <div className="eb-quill-wrap"><ReactQuill ref={quillRef} theme="snow" value={block.data.content || ''} onChange={v => patch('content', v)} modules={QUILL_FULL} formats={QUILL_FORMATS} placeholder="Write content…" /></div>
          </div>
          <MergeTagInsert onInsert={insertTag} />
          <FontPicker value={block.data.fontFamily || ''} onChange={v => patch('fontFamily', v)} />
          <ColorField label="Text Colour" value={block.data.color} onChange={v => patch('color', v)} defaultValue="#1f2937" />
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
            <select className="form-select" value={block.data.fontWeight || '600'} onChange={e => patch('fontWeight', e.target.value)}>
              <option value="400">Normal</option><option value="500">Medium</option><option value="600">Semi Bold</option><option value="700">Bold</option>
            </select>
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
            <select className="form-select" value={block.data.style || 'solid'} onChange={e => patch('style', e.target.value)}>
              <option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option>
            </select>
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
            <select className="form-select" value={block.data.layout || '50-50'} onChange={e => {
              const layout = e.target.value; const n = layout.split('-').length;
              const cols = Array.from({ length: n }, (_, i) => block.data.columns?.[i] || { blocks: [] });
              onUpdate({ data: { ...block.data, layout, columns: cols } });
            }}>
              <option value="50-50">50 / 50</option><option value="33-67">33 / 67</option><option value="67-33">67 / 33</option><option value="33-33-33">33 / 33 / 33</option>
            </select>
          </div>
          <div className="form-group"><label>Gap ({block.data.gap || 16}px)</label><input type="range" min="0" max="40" step="2" value={block.data.gap || 16} onChange={e => patch('gap', e.target.value)} style={{ width: '100%' }} /></div>
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

        <BlockSpacing padding={block.data.padding} onChange={patchPad} />
      </div>
    </>
  );
}
