import { useState, useEffect, useRef } from 'react';
import { Upload, X, ChevronDown, ChevronRight, Tag, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GOOGLE_FONTS, MERGE_TAGS, BRAND, loadGoogleFont } from './constants';

/* ── Colour field with hex input + reset ── */
export function ColorField({ label, value, onChange, defaultValue = '' }: {
  label: string; value: string; onChange: (v: string) => void; defaultValue?: string;
}) {
  const display = value || defaultValue || '#000000';
  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="color" value={display} onChange={e => onChange(e.target.value)}
          style={{ width: 36, height: 36, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 'var(--radius-sm)' }} />
        <input className="form-input" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="Default" style={{ fontSize: 13, fontFamily: 'monospace', flex: 1 }} />
        {value && <button type="button" className="row-action-btn" onClick={() => onChange('')} title="Reset"><X size={12} /></button>}
      </div>
    </div>
  );
}

/* ── Alignment toggle ── */
export function AlignField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="form-group">
      <label>Alignment</label>
      <div className="eb-align-toggle">
        {['left', 'center', 'right'].map(a => (
          <button key={a} type="button" className={`eb-align-btn${(value || 'center') === a ? ' active' : ''}`}
            onClick={() => onChange(a)}>{a}</button>
        ))}
      </div>
    </div>
  );
}

/* ── Font picker with search + preview ── */
export function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  useEffect(() => {
    if (value) { const n = value.replace(/'/g, '').split(',')[0]; if (n) loadGoogleFont(n); }
  }, [value]);

  const display = value ? value.replace(/'/g, '').split(',')[0] : 'Default';
  const filtered = GOOGLE_FONTS.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="form-group" style={{ position: 'relative' }} ref={ref}>
      <label>Font Family</label>
      <button type="button" className="form-input" onClick={() => setOpen(!open)}
        style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontFamily: value || 'inherit' }}>
        <span>{display}</span><ChevronDown size={14} style={{ opacity: .5 }} />
      </button>
      {open && (
        <div className="eb-font-dropdown">
          <input className="form-input" placeholder="Search fonts…" value={search}
            onChange={e => setSearch(e.target.value)} autoFocus style={{ marginBottom: 8 }} />
          <div className="eb-font-list">
            <button type="button" className={`eb-font-item${!value ? ' active' : ''}`}
              onClick={() => { onChange(''); setOpen(false); }}>System Default</button>
            {filtered.map(f => (
              <button type="button" key={f.name} className={`eb-font-item${value === f.value ? ' active' : ''}`}
                onClick={() => { loadGoogleFont(f.name); onChange(f.value); setOpen(false); }}
                onMouseEnter={() => loadGoogleFont(f.name)}
                style={{ fontFamily: f.value }}>{f.name}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Image upload to Supabase Storage ── */
export function ImageUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('email-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('email-images').getPublicUrl(path);
      onUploaded(data.publicUrl);
    } catch (err: any) {
      console.error('Image upload error:', err);
      alert(`Image upload failed: ${err.message || err}`);
    } finally { setUploading(false); e.target.value = ''; }
  }

  return (
    <label className="btn-secondary" style={{ flex: 1, cursor: 'pointer', textAlign: 'center', opacity: uploading ? .6 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload Image'}
      <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading} onChange={handle} />
    </label>
  );
}

/* ── Merge Tag insert button (dropdown) ── */
export function MergeTagInsert({ onInsert }: { onInsert: (tag: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="form-group" style={{ position: 'relative' }}>
      <button type="button" className="btn-secondary" onClick={() => setOpen(!open)}
        style={{ width: '100%', justifyContent: 'center', gap: 6 }}>
        <Tag size={14} /> Insert Merge Tag
      </button>
      {open && (
        <div className="eb-merge-dropdown">
          {MERGE_TAGS.map(g => (
            <div key={g.group}>
              <div className="eb-merge-group">{g.group}</div>
              {g.tags.map(t => (
                <button type="button" key={t.key} className="eb-merge-option"
                  onClick={() => { onInsert(t.key); setOpen(false); }}>
                  <Tag size={12} style={{ color: BRAND, flexShrink: 0 }} /> {t.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Block padding/spacing (collapsible TRBL) ── */
export function BlockSpacing({ padding, onChange }: {
  padding: Record<string, number>; onChange: (side: string, val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const p = padding || { top: 0, right: 0, bottom: 0, left: 0 };
  return (
    <>
      <div className="eb-divider" />
      <button type="button" className="eb-section-toggle" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} <span>Block Spacing</span>
      </button>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          {(['top', 'right', 'bottom', 'left'] as const).map(s => (
            <div className="form-group" key={s} style={{ marginBottom: 0 }}>
              <label style={{ textTransform: 'capitalize' }}>{s} (px)</label>
              <input className="form-input" type="number" value={p[s] || 0}
                onChange={e => onChange(s, e.target.value)} min={0} max={80} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
