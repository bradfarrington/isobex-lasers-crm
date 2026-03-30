import { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { StoreTabBar } from './StoreTabBar';
import { useAlert } from '@/components/ui/AlertDialog';
import * as api from '@/lib/api';
import type { StoreConfig, StorePage, PageSeo } from '@/types/database';
import { Save, ChevronDown, ChevronRight, Globe, FileText } from 'lucide-react';

export function SeoPage() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data
  const [globalDraft, setGlobalDraft] = useState<Partial<StoreConfig>>({});
  const [storePages, setStorePages] = useState<StorePage[]>([]);
  const [pageDrafts, setPageDrafts] = useState<Record<string, Partial<PageSeo>>>({});

  // UI
  const [expandedSection, setExpandedSection] = useState<string>('global');

  useEffect(() => {
    Promise.all([
      api.fetchStoreConfig(),
      api.fetchStorePages(),
      api.fetchAllPageSeo()
    ])
      .then(([cfg, pages, seoRecords]) => {
        setGlobalDraft(cfg);
        setStorePages(pages);
        
        const initialPageDrafts: Record<string, Partial<PageSeo>> = {};
        pages.forEach((page) => {
          const existing = seoRecords.find(s => s.page_key === page.page_key);
          initialPageDrafts[page.page_key] = existing || { page_key: page.page_key };
        });
        setPageDrafts(initialPageDrafts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateGlobalDraft = (updates: Partial<StoreConfig>) => {
    setGlobalDraft((prev) => ({ ...prev, ...updates }));
  };

  const updatePageDraft = (pageKey: string, updates: Partial<PageSeo>) => {
    setPageDrafts((prev) => ({
      ...prev,
      [pageKey]: { ...prev[pageKey], ...updates }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save global store config
      await api.updateStoreConfig(globalDraft as any);

      // 2. Upsert each page's SEO overrides
      const updatePromises = storePages.map((page) => {
        const draft = pageDrafts[page.page_key];
        // Only attempt to upsert if there actually is changes or we have something to save. 
        // We'll safely upsert all to be thorough and ensure existing records without data simply get nulls.
        return api.upsertPageSeo(page.page_key, {
          meta_title: draft.meta_title || null,
          meta_description: draft.meta_description || null,
          og_image_url: draft.og_image_url || null,
        });
      });

      await Promise.all(updatePromises);

      showAlert({ title: 'Saved', message: 'SEO settings saved successfully.', variant: 'success' });
    } catch (err) {
      console.error(err);
      showAlert({ title: 'Error', message: 'Failed to save SEO settings.', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? '' : section));
  };

  if (loading) {
    return (
      <PageShell title="Online Store" subtitle="Manage your store's search engine optimization.">
        <StoreTabBar />
        <div className="store-loading">Loading SEO settings...</div>
      </PageShell>
    );
  }

  // Pre-compute rendering data
  const sections = [
    { key: 'global', title: 'Global SEO Defaults', icon: Globe, isGlobal: true },
    ...storePages.map((p) => ({ key: p.page_key, title: `${p.title} Page`, icon: FileText, isGlobal: false }))
  ];

  return (
    <PageShell title="Online Store" subtitle="Manage your store's search engine optimization.">
      <StoreTabBar />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>SEO Settings</h2>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {sections.map(({ key, title, icon: Icon, isGlobal }) => {
          const isExpanded = expandedSection === key;
          const draft = isGlobal ? globalDraft : pageDrafts[key];
          
          const metaTitle = isGlobal ? (draft as Partial<StoreConfig>).seo_title : (draft as Partial<PageSeo>).meta_title;
          const metaDesc = isGlobal ? (draft as Partial<StoreConfig>).seo_description : (draft as Partial<PageSeo>).meta_description;
          const metaImage = isGlobal ? (draft as Partial<StoreConfig>).seo_image_url : (draft as Partial<PageSeo>).og_image_url;

          const updateSectionDraft = (updates: any) => {
            if (isGlobal) {
              updateGlobalDraft(updates);
            } else {
              updatePageDraft(key, updates);
            }
          };

          const isDynamicPage = key === 'product_detail' || key === 'collection_detail';
          const dynamicSubtitle = key === 'product_detail' 
            ? 'Use merge tags like {{title}}, {{description}}, and {{price}} to dynamically insert product details.'
            : 'Use merge tags like {{title}} and {{description}} to dynamically insert collection details.';

          const subtitle = isGlobal 
            ? 'Default fallback meta tags for pages without specific SEO overrides.' 
            : `Set SEO metadata exclusively for the ${title}. ${isDynamicPage ? dynamicSubtitle : ''}`;

          // Replace merge tags for preview purposes
          const previewTitle = (metaTitle || (isGlobal ? 'Isobex Lasers' : 'Page Title'))
            .replace(/\{\{title\}\}/gi, isDynamicPage ? 'Sample Name' : '{{title}}')
            .replace(/\{\{price\}\}/gi, isDynamicPage ? '$99.00' : '{{price}}');
            
          const previewDesc = (metaDesc || 'No description set.')
            .replace(/\{\{title\}\}/gi, isDynamicPage ? 'Sample Name' : '{{title}}')
            .replace(/\{\{description\}\}/gi, isDynamicPage ? 'Sample item description goes here...' : '{{description}}')
            .replace(/\{\{price\}\}/gi, isDynamicPage ? '$99.00' : '{{price}}');

          return (
            <div key={key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => toggleSection(key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1.25rem 1.5rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Icon size={20} color={isExpanded ? 'var(--color-primary)' : 'var(--text-secondary)'} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
                </div>
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>

              {isExpanded && (
                <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: '1rem 0 1.5rem' }}>
                    {subtitle}
                  </p>

                  <div className="form-group">
                    <label className="form-label">Meta Title</label>
                    <input
                      type="text"
                      className="form-input"
                      value={metaTitle || ''}
                      onChange={(e) => updateSectionDraft(isGlobal ? { seo_title: e.target.value } : { meta_title: e.target.value })}
                      placeholder={isGlobal ? "Isobex Lasers — Premium Laser Equipment" : "Page Title"}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Meta Description</label>
                    <textarea
                      className="form-input form-textarea"
                      rows={3}
                      value={metaDesc || ''}
                      onChange={(e) => updateSectionDraft(isGlobal ? { seo_description: e.target.value } : { meta_description: e.target.value })}
                      placeholder={isGlobal ? "Browse our range of precision laser equipment..." : "Description for this page..."}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Social Share Image URL</label>
                    <input
                      type="text"
                      className="form-input"
                      value={metaImage || ''}
                      onChange={(e) => updateSectionDraft(isGlobal ? { seo_image_url: e.target.value } : { og_image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  {/* Preview card */}
                  {(metaTitle || metaDesc) && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-surface, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Google Preview</p>
                      <div style={{ fontSize: '1.125rem', color: '#1a0dab', marginBottom: '0.25rem' }}>
                        {previewTitle}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#006621', marginBottom: '0.25rem' }}>
                        {globalDraft.custom_domain || 'yourstore.com'} {isGlobal ? '' : `> ${key}`}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#545454', lineHeight: 1.4 }}>
                        {previewDesc}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
