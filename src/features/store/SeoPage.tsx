import { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { StoreTabBar } from './StoreTabBar';
import { useAlert } from '@/components/ui/AlertDialog';
import * as api from '@/lib/api';
import type { StoreConfig } from '@/types/database';
import { Save } from 'lucide-react';

export function SeoPage() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<StoreConfig>>({});

  useEffect(() => {
    api.fetchStoreConfig()
      .then((cfg) => setDraft(cfg))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateDraft = (updates: Partial<StoreConfig>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await api.updateStoreConfig(draft as any);
      setDraft(saved);
      showAlert({ title: 'Saved', message: 'SEO settings saved successfully.', variant: 'success' });
    } catch (err) {
      console.error(err);
      showAlert({ title: 'Error', message: 'Failed to save SEO settings.', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="Online Store" subtitle="Manage your store's search engine optimization.">
      <StoreTabBar />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>SEO Settings</h2>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {loading ? (
        <div className="store-loading">Loading SEO settings...</div>
      ) : (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600 }}>Search Engine Optimization</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: '0 0 1.5rem' }}>
            Default fallback meta tags for pages without specific SEO overrides.
          </p>

          <div className="form-group">
            <label className="form-label">Meta Title</label>
            <input
              type="text"
              className="form-input"
              value={draft.seo_title || ''}
              onChange={(e) => updateDraft({ seo_title: e.target.value })}
              placeholder="Isobex Lasers — Premium Laser Equipment"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Meta Description</label>
            <textarea
              className="form-input form-textarea"
              rows={3}
              value={draft.seo_description || ''}
              onChange={(e) => updateDraft({ seo_description: e.target.value })}
              placeholder="Browse our range of precision laser equipment..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Social Share Image URL</label>
            <input
              type="text"
              className="form-input"
              value={draft.seo_image_url || ''}
              onChange={(e) => updateDraft({ seo_image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          {/* Preview card */}
          {(draft.seo_title || draft.seo_description) && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-surface, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Google Preview</p>
              <div style={{ fontSize: '1.125rem', color: '#1a0dab', marginBottom: '0.25rem' }}>{draft.seo_title || 'Page Title'}</div>
              <div style={{ fontSize: '0.8125rem', color: '#006621', marginBottom: '0.25rem' }}>{draft.custom_domain || 'yourstore.com'}</div>
              <div style={{ fontSize: '0.8125rem', color: '#545454', lineHeight: 1.4 }}>{draft.seo_description || 'No description set.'}</div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
