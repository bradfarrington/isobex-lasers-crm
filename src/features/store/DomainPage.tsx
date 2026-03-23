import { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { StoreTabBar } from './StoreTabBar';
import { useAlert } from '@/components/ui/AlertDialog';
import * as api from '@/lib/api';
import type { StoreConfig } from '@/types/database';
import { Save } from 'lucide-react';

export function DomainPage() {
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
      showAlert({ title: 'Saved', message: 'Domain settings saved successfully.', variant: 'success' });
    } catch (err) {
      console.error(err);
      showAlert({ title: 'Error', message: 'Failed to save domain settings.', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="Online Store" subtitle="Connect your store to a custom domain.">
      <StoreTabBar />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Custom Domain</h2>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {loading ? (
        <div className="store-loading">Loading domain settings...</div>
      ) : (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600 }}>Domain Configuration</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: '0 0 1.5rem' }}>
            Point your domain's CNAME record to your Vercel deployment URL.
          </p>

          <div className="form-group">
            <label className="form-label">Custom Domain</label>
            <input
              type="text"
              className="form-input"
              value={draft.custom_domain || ''}
              onChange={(e) => updateDraft({ custom_domain: e.target.value })}
              placeholder="shop.isobex.co.uk"
            />
          </div>

          {draft.custom_domain && (
            <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'var(--bg-surface, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem', fontWeight: 600 }}>DNS Setup Instructions</h4>
              <ol style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.8, fontSize: '0.875rem' }}>
                <li>Go to your domain provider's DNS settings</li>
                <li>
                  Add a <strong>CNAME</strong> record:
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--bg-primary, #fff)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                    <div><strong>Type:</strong> CNAME</div>
                    <div><strong>Name:</strong> {draft.custom_domain?.split('.')[0] || 'shop'}</div>
                    <div><strong>Value:</strong> cname.vercel-dns.com</div>
                  </div>
                </li>
                <li>Add <strong>{draft.custom_domain}</strong> as a custom domain in your Vercel project settings</li>
                <li>Vercel will automatically provision SSL</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
