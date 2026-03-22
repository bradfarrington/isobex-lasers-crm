import { useState, useRef } from 'react';
import { Image as ImageIcon, Tag, Monitor, Smartphone, EyeOff, Settings } from 'lucide-react';
import DOMPurify from 'dompurify';
import { BRAND, MERGE_TAGS, cleanHtml, replaceMergeTags, loadGoogleFont, tagLabel } from './constants';
import type { BlockData } from './constants';
import { ColorField, FontPicker, MergeTagInsert } from './components';

/* ═══════════════════════════════════════
   BLOCK PREVIEW (Canvas rendering)
   ═══════════════════════════════════════ */
export function BlockPreview({ block, isPreview = false, isMobile = false, onColumnDrop, onSubBlockSelect, selectedSubBlockId, globalSettings = {} }: {
  block: BlockData; isPreview?: boolean; isMobile?: boolean;
  onColumnDrop?: (parentId: string, colIdx: number, type: string) => void;
  onSubBlockSelect?: (parentId: string, colIdx: number, blockId: string) => void;
  selectedSubBlockId?: string; globalSettings?: Record<string, any>;
}) {
  const { type, data } = block;
  const resolve = (t: string) => isPreview ? replaceMergeTags(t || '') : (t || '');
  const p = data.padding || {};
  const pad = `${p.top||0}px ${p.right||0}px ${p.bottom||0}px ${p.left||0}px`;
  const tc = globalSettings.textColor || '#1f2937';
  const font = data.fontFamily || globalSettings.fontFamily || "'Inter', sans-serif";

  if (data.fontFamily) { const n = data.fontFamily.replace(/'/g,'').split(',')[0]; if (n) loadGoogleFont(n); }

  switch (type) {
    case 'heading': {
      const sz = data.level === 'h1' ? '28px' : data.level === 'h3' ? '18px' : '22px';
      return <div style={{ color: data.color||tc, padding: pad, fontSize: sz, fontWeight: 700, lineHeight: 1.3, fontFamily: font }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cleanHtml(resolve(data.content)) || '<p>Heading</p>') }} />;
    }
    case 'text':
      return <div style={{ color: data.color||tc, fontSize: '15px', lineHeight: 1.7, padding: pad, fontFamily: font }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cleanHtml(resolve(data.content)) || '<p>Text block</p>') }} />;
    case 'image': {
      if (!data.src) return !isPreview ? <div className="eb-placeholder"><ImageIcon size={24} /><br/>Click to add an image</div> : null;
      return (
        <div style={{ textAlign: (data.align||'center') as any, padding: pad }}>
          <img src={data.src} alt={data.alt||''} style={{ maxWidth: `${data.width||100}%`, borderRadius: `${data.borderRadius||0}px`, display: 'block', margin: '0 auto' }} />
        </div>
      );
    }
    case 'button':
      return (
        <div style={{ textAlign: (data.align||'center') as any, padding: pad }}>
          <a href="#" onClick={e => e.preventDefault()} style={{ display: data.fullWidth?'block':'inline-block', padding: `${data.paddingV||12}px ${data.paddingH||32}px`, backgroundColor: data.bgColor||BRAND, color: data.textColor||'#fff', borderRadius: `${data.borderRadius||8}px`, textDecoration: 'none', fontWeight: data.fontWeight||600, fontSize: `${data.fontSize||15}px`, fontFamily: font, textAlign: 'center', border: 'none', cursor: 'default' }}>{data.text||'Button'}</a>
        </div>
      );
    case 'divider':
      return <div style={{ padding: `${data.marginTop||8}px 0 ${data.marginBottom||8}px` }}><hr style={{ width: `${data.width||100}%`, border: 'none', borderTop: `${data.thickness||1}px ${data.style||'solid'} ${data.color||'#e5e7eb'}`, margin: '0 auto' }} /></div>;
    case 'spacer':
      return <div style={{ height: `${data.height||32}px`, background: data.bgColor||'transparent' }} />;
    case 'merge_tag':
      if (!isPreview) return <div style={{ padding: '4px 0' }}><span className="eb-merge-badge"><Tag size={12} /> {tagLabel(data.tag)}</span></div>;
      return <div style={{ padding: pad, fontSize: `${data.fontSize||15}px`, fontWeight: data.fontWeight||400, color: data.color||tc, fontFamily: font }}>{replaceMergeTags(data.tag||'')}</div>;
    case 'columns': {
      const cols = data.columns || [];
      const gap = data.gap !== undefined ? Number(data.gap) : 16;
      const parts = (data.layout||'50-50').split('-').map(Number);
      const stack = isMobile;

      if (!isPreview) {
        return (
          <div style={{ display: 'flex', flexDirection: stack?'column':'row', padding: pad, gap: `${gap}px` }}>
            {cols.map((col: any, i: number) => (
              <div key={i} style={{ flex: parts[i]||1, border: '1px dashed var(--color-border)', borderRadius: 4, padding: 12, minHeight: 60, background: col.bgColor||'transparent' }}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = BRAND; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = ''; }}
                onDrop={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = ''; const t = e.dataTransfer.getData('text/plain'); if (t && t !== '__reorder__' && t !== 'columns' && onColumnDrop) onColumnDrop(block.id, i, t); }}
              >
                {col.blocks?.length > 0 ? col.blocks.map((b: BlockData) => (
                  <div key={b.id} onClick={onSubBlockSelect ? (e: React.MouseEvent) => { e.stopPropagation(); onSubBlockSelect(block.id, i, b.id); } : undefined}
                    style={{ cursor: 'pointer', outline: selectedSubBlockId === b.id ? `2px solid ${BRAND}` : 'none', borderRadius: 4, position: 'relative' }}>
                    <BlockPreview block={b} isPreview={false} globalSettings={globalSettings} />
                  </div>
                )) : <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 12, padding: 16 }}>Drop blocks here</div>}
              </div>
            ))}
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', flexDirection: stack?'column':'row', gap: `${gap}px`, padding: pad }}>
          {cols.map((col: any, i: number) => (
            <div key={i} style={{ flex: parts[i]||1, padding: 12, background: col.bgColor||'transparent' }}>
              {(col.blocks||[]).map((b: BlockData) => <BlockPreview key={b.id} block={b} isPreview isMobile={isMobile} globalSettings={globalSettings} />)}
            </div>
          ))}
        </div>
      );
    }
    default: return <div style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Unknown block</div>;
  }
}

/* ═══════════════════════════════════════
   PREVIEW MODE
   ═══════════════════════════════════════ */
export function PreviewMode({ blocks, settings, onExit }: {
  blocks: BlockData[]; settings: Record<string, any>; onExit: () => void;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const emailWidth = settings.width || 600;
  const font = settings.fontFamily || "'Inter', sans-serif";
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div className="eb-preview-bar">
        <div className="eb-preview-dot" />
        <span className="eb-preview-label">Preview</span>
        <div className="eb-device-toggle">
          <button className={`eb-device-btn${!isMobile ? ' active' : ''}`} onClick={() => setIsMobile(false)}><Monitor size={14} /> Desktop</button>
          <button className={`eb-device-btn${isMobile ? ' active' : ''}`} onClick={() => setIsMobile(true)}><Smartphone size={14} /> Mobile</button>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn-secondary" onClick={onExit}><EyeOff size={14} /> Back to editing</button>
      </div>
      <div style={{ padding: 32, background: settings.bodyBg || '#f5f5f5', minHeight: 'calc(100vh - 100px)' }}>
        <div style={{ maxWidth: isMobile ? 375 : emailWidth, margin: '0 auto', background: settings.contentBg || '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.08)', fontFamily: font, color: settings.textColor || '#1f2937' }}>
          {settings.logoUrl && <div style={{ padding: 24, textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}><img src={settings.logoUrl} alt="Logo" style={{ maxHeight: 48, maxWidth: '60%' }} /></div>}
          <div className="eb-email-content" style={{ padding: '24px 20px' }}>
            {blocks.map(b => <div key={b.id} style={{ marginBottom: 16 }}><BlockPreview block={b} isPreview isMobile={isMobile} globalSettings={settings} /></div>)}
            {blocks.length === 0 && <p style={{ color: '#9ca3af', textAlign: 'center', padding: '48px 0' }}>No content blocks yet</p>}
          </div>
          {settings.footerText && <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>{replaceMergeTags(settings.footerText)}</div>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   GLOBAL SETTINGS PANEL
   ═══════════════════════════════════════ */
export function GlobalSettingsPanel({ settings, onUpdate }: {
  settings: Record<string, any>; onUpdate: (s: Record<string, any>) => void;
}) {
  const patch = (k: string, v: any) => onUpdate({ ...settings, [k]: v });
  const [showSubjectTags, setShowSubjectTags] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);

  const insertSubjectTag = (tag: string) => {
    const input = subjectRef.current;
    if (!input) { patch('subject', (settings.subject || '') + tag); setShowSubjectTags(false); return; }
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const val = settings.subject || '';
    const newVal = val.slice(0, start) + tag + val.slice(end);
    patch('subject', newVal);
    setShowSubjectTags(false);
    setTimeout(() => { input.focus(); input.setSelectionRange(start + tag.length, start + tag.length); }, 0);
  };

  return (
    <>
      <div className="eb-right-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={13} /><span style={{ fontWeight: 700 }}>Email Settings</span></div>
      </div>
      <div className="eb-right-scroll">
        <div className="eb-section-label">Email Metadata</div>
        <div className="form-group">
          <label>Subject Line</label>
          <input ref={subjectRef} className="form-input" value={settings.subject || ''} onChange={e => patch('subject', e.target.value)} placeholder="Enter subject…" />
          <div style={{ position: 'relative', marginTop: 4 }}>
            <button type="button" className="btn-secondary" onClick={() => setShowSubjectTags(p => !p)} style={{ fontSize: 12, gap: 4, width: '100%', justifyContent: 'center' }}>
              <Tag size={12} /> Insert Merge Tag
            </button>
            {showSubjectTags && (
              <div className="eb-merge-dropdown" style={{ top: '100%', left: 0, right: 0 }}>
                {MERGE_TAGS.map(g => (
                  <div key={g.group}>
                    <div className="eb-merge-group">{g.group}</div>
                    {g.tags.map(t => (
                      <button key={t.key} type="button" className="eb-merge-option" onClick={() => insertSubjectTag(t.key)}>
                        <Tag size={11} style={{ opacity: .4 }} /> {t.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="form-group"><label>Preview Text <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(inbox snippet)</span></label><input className="form-input" value={settings.previewText || ''} onChange={e => patch('previewText', e.target.value)} placeholder="Brief text…" /></div>
        <div className="eb-divider" />
        <div className="eb-section-label">Design</div>
        <div className="form-group"><label>Email Width (px)</label><input className="form-input" type="number" value={settings.width || 600} onChange={e => patch('width', Number(e.target.value))} min={400} max={800} /></div>
        <ColorField label="Body Background" value={settings.bodyBg || ''} onChange={v => patch('bodyBg', v)} defaultValue="#f5f5f5" />
        <ColorField label="Content Background" value={settings.contentBg || ''} onChange={v => patch('contentBg', v)} defaultValue="#ffffff" />
        <FontPicker value={settings.fontFamily || ''} onChange={v => patch('fontFamily', v)} />
        <ColorField label="Default Text Colour" value={settings.textColor || ''} onChange={v => patch('textColor', v)} defaultValue="#1f2937" />
        <ColorField label="Link Colour" value={settings.linkColor || ''} onChange={v => patch('linkColor', v)} defaultValue={BRAND} />
        <div className="eb-divider" />
        <div className="form-group"><label>Header Logo URL <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(optional)</span></label><input className="form-input" value={settings.logoUrl || ''} onChange={e => patch('logoUrl', e.target.value)} placeholder="https://…" /></div>
        <div className="form-group"><label>Footer Text</label><textarea className="form-textarea" value={settings.footerText || ''} onChange={e => patch('footerText', e.target.value)} rows={3} style={{ fontSize: 13 }} /></div>
      </div>
    </>
  );
}
