import { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { StoreTabBar } from './StoreTabBar';
import { useAlert } from '@/components/ui/AlertDialog';
import * as api from '@/lib/api';
import type { StoreConfig, ShippingZone, ShippingRate } from '@/types/database';
import {
  Save,
  Paintbrush,
  Type,
  Layout,
  Globe,
  Image,
  Search,
  Truck,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import './StoreBuilder.css';

type BuilderPanel =
  | 'brand'
  | 'colours'
  | 'typography'
  | 'header'
  | 'footer'
  | 'homepage'
  | 'seo'
  | 'shipping'
  | 'domain';

const PANELS: { key: BuilderPanel; label: string; icon: any }[] = [
  { key: 'brand', label: 'Brand', icon: Paintbrush },
  { key: 'colours', label: 'Colours', icon: Paintbrush },
  { key: 'typography', label: 'Typography', icon: Type },
  { key: 'header', label: 'Header', icon: Layout },
  { key: 'footer', label: 'Footer', icon: Layout },
  { key: 'homepage', label: 'Homepage', icon: Image },
  { key: 'seo', label: 'SEO', icon: Search },
  { key: 'shipping', label: 'Shipping', icon: Truck },
  { key: 'domain', label: 'Domain', icon: Globe },
];

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Outfit', 'Raleway', 'Nunito', 'Playfair Display', 'Oswald',
  'Source Sans 3', 'DM Sans', 'Space Grotesk', 'Manrope', 'Sora',
];

export function StoreBuilderPage() {
  const { showAlert } = useAlert();
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePanel, setActivePanel] = useState<BuilderPanel>('brand');

  // Shipping state
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);

  // Draft state for edits
  const [draft, setDraft] = useState<Partial<StoreConfig>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const [cfg, zones, rates] = await Promise.all([
        api.fetchStoreConfig(),
        api.fetchShippingZones(),
        api.fetchShippingRates(),
      ]);
      setConfig(cfg);
      setDraft(cfg);
      setShippingZones(zones);
      setShippingRates(rates);
    } catch (err) {
      console.error('Failed to load store config:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (updates: Partial<StoreConfig>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await api.updateStoreConfig(draft as any);
      setConfig(saved);
      setDraft(saved);
      showAlert({ title: 'Saved', message: 'Store configuration saved.', variant: 'success' });
    } catch (err) {
      console.error('Failed to save:', err);
      showAlert({ title: 'Error', message: 'Failed to save store configuration.', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Header nav link helpers ───────────
  const headerLayout = (draft as any)?.header_layout || { logo_position: 'left', nav_links: [] };
  const navLinks: { label: string; url: string }[] = headerLayout.nav_links || [];

  const addNavLink = () => {
    const updated = [...navLinks, { label: '', url: '' }];
    updateDraft({ header_layout: { ...headerLayout, nav_links: updated } } as any);
  };

  const updateNavLink = (index: number, field: 'label' | 'url', value: string) => {
    const updated = navLinks.map((l, i) => (i === index ? { ...l, [field]: value } : l));
    updateDraft({ header_layout: { ...headerLayout, nav_links: updated } } as any);
  };

  const removeNavLink = (index: number) => {
    const updated = navLinks.filter((_, i) => i !== index);
    updateDraft({ header_layout: { ...headerLayout, nav_links: updated } } as any);
  };

  // ─── Footer helpers ───────────────────
  const footerConfig = (draft as any)?.footer_config || { columns: [], social_links: [], copyright: '' };

  const addFooterColumn = () => {
    const updated = {
      ...footerConfig,
      columns: [...(footerConfig.columns || []), { title: '', links: [] }],
    };
    updateDraft({ footer_config: updated } as any);
  };

  const updateFooterColumn = (index: number, title: string) => {
    const updated = {
      ...footerConfig,
      columns: footerConfig.columns.map((c: any, i: number) =>
        i === index ? { ...c, title } : c
      ),
    };
    updateDraft({ footer_config: updated } as any);
  };

  const removeFooterColumn = (index: number) => {
    const updated = {
      ...footerConfig,
      columns: footerConfig.columns.filter((_: any, i: number) => i !== index),
    };
    updateDraft({ footer_config: updated } as any);
  };

  const addFooterLink = (colIndex: number) => {
    const cols = [...footerConfig.columns];
    cols[colIndex] = {
      ...cols[colIndex],
      links: [...(cols[colIndex].links || []), { label: '', url: '' }],
    };
    updateDraft({ footer_config: { ...footerConfig, columns: cols } } as any);
  };

  const updateFooterLink = (colIndex: number, linkIndex: number, field: 'label' | 'url', value: string) => {
    const cols = [...footerConfig.columns];
    cols[colIndex] = {
      ...cols[colIndex],
      links: cols[colIndex].links.map((l: any, i: number) =>
        i === linkIndex ? { ...l, [field]: value } : l
      ),
    };
    updateDraft({ footer_config: { ...footerConfig, columns: cols } } as any);
  };

  const removeFooterLink = (colIndex: number, linkIndex: number) => {
    const cols = [...footerConfig.columns];
    cols[colIndex] = {
      ...cols[colIndex],
      links: cols[colIndex].links.filter((_: any, i: number) => i !== linkIndex),
    };
    updateDraft({ footer_config: { ...footerConfig, columns: cols } } as any);
  };

  // Social links
  const socialLinks: { platform: string; url: string }[] = footerConfig.social_links || [];

  const addSocialLink = () => {
    const updated = {
      ...footerConfig,
      social_links: [...socialLinks, { platform: '', url: '' }],
    };
    updateDraft({ footer_config: updated } as any);
  };

  const updateSocialLink = (index: number, field: 'platform' | 'url', value: string) => {
    const updated = {
      ...footerConfig,
      social_links: socialLinks.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    };
    updateDraft({ footer_config: updated } as any);
  };

  const removeSocialLink = (index: number) => {
    const updated = {
      ...footerConfig,
      social_links: socialLinks.filter((_, i) => i !== index),
    };
    updateDraft({ footer_config: updated } as any);
  };

  // ─── Shipping helpers ─────────────────
  const addShippingRate = async (zoneId: string) => {
    try {
      const rate = await api.createShippingRate({
        zone_id: zoneId,
        name: 'New Rate',
        min_weight_kg: 0,
        max_weight_kg: 999,
        price: 0,
        estimated_days_min: 3,
        estimated_days_max: 5,
        sort_order: shippingRates.filter((r) => r.zone_id === zoneId).length,
        is_active: true,
      });
      setShippingRates((prev) => [...prev, rate]);
    } catch (err) {
      console.error('Failed to add rate:', err);
    }
  };

  const updateRate = async (id: string, field: string, value: any) => {
    setShippingRates((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const saveRate = async (rate: ShippingRate) => {
    try {
      await api.updateShippingRate(rate.id, {
        name: rate.name,
        min_weight_kg: rate.min_weight_kg,
        max_weight_kg: rate.max_weight_kg,
        price: rate.price,
        estimated_days_min: rate.estimated_days_min,
        estimated_days_max: rate.estimated_days_max,
        is_active: rate.is_active,
      });
    } catch (err) {
      console.error('Failed to save rate:', err);
    }
  };

  const deleteRate = async (id: string) => {
    try {
      await api.deleteShippingRate(id);
      setShippingRates((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete rate:', err);
    }
  };

  if (loading) {
    return (
      <PageShell title="Online Store" subtitle="Store Builder">
        <StoreTabBar />
        <div className="store-loading">Loading store configuration...</div>
      </PageShell>
    );
  }

  if (!config) {
    return (
      <PageShell title="Online Store" subtitle="Store Builder">
        <StoreTabBar />
        <div className="store-empty">
          <h3>No store configuration found</h3>
          <p>Run the store-schema-phase2.sql to create the default configuration.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Online Store" subtitle="Customise your storefront appearance and settings.">
      <StoreTabBar />

      <div className="builder-header">
        <h2 className="builder-title">Store Builder</h2>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="builder-layout">
        {/* Panel navigation */}
        <nav className="builder-nav">
          {PANELS.map((panel) => {
            const Icon = panel.icon;
            return (
              <button
                key={panel.key}
                className={`builder-nav-item ${activePanel === panel.key ? 'active' : ''}`}
                onClick={() => setActivePanel(panel.key)}
              >
                <Icon size={16} />
                <span>{panel.label}</span>
                <ChevronRight size={14} className="builder-nav-chevron" />
              </button>
            );
          })}
        </nav>

        {/* Panel content */}
        <div className="builder-panel">
          {activePanel === 'brand' && (
            <div className="builder-panel-content">
              <h3>Brand Settings</h3>
              <div className="form-group">
                <label className="form-label">Store Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={draft.store_name || ''}
                  onChange={(e) => updateDraft({ store_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tagline</label>
                <input
                  type="text"
                  className="form-input"
                  value={draft.tagline || ''}
                  onChange={(e) => updateDraft({ tagline: e.target.value })}
                  placeholder="e.g. Precision laser technology for every industry"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Logo URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={draft.logo_url || ''}
                  onChange={(e) => updateDraft({ logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Favicon URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={draft.favicon_url || ''}
                  onChange={(e) => updateDraft({ favicon_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Currency Symbol</label>
                  <input
                    type="text"
                    className="form-input"
                    value={draft.currency_symbol || '£'}
                    onChange={(e) => updateDraft({ currency_symbol: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={draft.currency_code || 'GBP'}
                    onChange={(e) => updateDraft({ currency_code: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {activePanel === 'colours' && (
            <div className="builder-panel-content">
              <h3>Colour Palette</h3>
              <p className="form-hint">Set the colours used throughout your storefront.</p>
              {[
                { key: 'color_primary', label: 'Primary' },
                { key: 'color_secondary', label: 'Secondary' },
                { key: 'color_accent', label: 'Accent' },
                { key: 'color_background', label: 'Background' },
                { key: 'color_surface', label: 'Surface' },
                { key: 'color_text', label: 'Text' },
                { key: 'color_text_secondary', label: 'Text Secondary' },
              ].map(({ key, label }) => (
                <div className="color-field" key={key}>
                  <label className="form-label">{label}</label>
                  <div className="color-input-wrap">
                    <input
                      type="color"
                      className="color-picker"
                      value={(draft as any)[key] || '#000000'}
                      onChange={(e) => updateDraft({ [key]: e.target.value } as any)}
                    />
                    <input
                      type="text"
                      className="form-input color-hex"
                      value={(draft as any)[key] || ''}
                      onChange={(e) => updateDraft({ [key]: e.target.value } as any)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activePanel === 'typography' && (
            <div className="builder-panel-content">
              <h3>Typography</h3>
              <p className="form-hint">Choose fonts from Google Fonts.</p>
              <div className="form-group">
                <label className="form-label">Heading Font</label>
                <select
                  className="form-input"
                  value={draft.font_heading || 'Inter'}
                  onChange={(e) => updateDraft({ font_heading: e.target.value })}
                >
                  {GOOGLE_FONTS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Body Font</label>
                <select
                  className="form-input"
                  value={draft.font_body || 'Inter'}
                  onChange={(e) => updateDraft({ font_body: e.target.value })}
                >
                  {GOOGLE_FONTS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="typography-preview" style={{ fontFamily: draft.font_body || 'Inter' }}>
                <h4 style={{ fontFamily: draft.font_heading || 'Inter' }}>Heading Preview</h4>
                <p>This is how your body text will look on the storefront.</p>
              </div>
            </div>
          )}

          {activePanel === 'header' && (
            <div className="builder-panel-content">
              <h3>Header</h3>
              <div className="form-group">
                <label className="form-label">Logo Position</label>
                <div className="radio-group">
                  <label className={`radio-option ${headerLayout.logo_position === 'left' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      checked={headerLayout.logo_position === 'left'}
                      onChange={() => updateDraft({ header_layout: { ...headerLayout, logo_position: 'left' } } as any)}
                    />
                    <span>Left</span>
                  </label>
                  <label className={`radio-option ${headerLayout.logo_position === 'center' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      checked={headerLayout.logo_position === 'center'}
                      onChange={() => updateDraft({ header_layout: { ...headerLayout, logo_position: 'center' } } as any)}
                    />
                    <span>Center</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Announcement Bar</label>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={draft.announcement_bar_active ?? false}
                    onChange={(e) => updateDraft({ announcement_bar_active: e.target.checked })}
                  />
                  <span>Show announcement bar</span>
                </label>
                {draft.announcement_bar_active && (
                  <input
                    type="text"
                    className="form-input"
                    value={draft.announcement_bar_text || ''}
                    onChange={(e) => updateDraft({ announcement_bar_text: e.target.value })}
                    placeholder="e.g. Free shipping on orders over £100!"
                    style={{ marginTop: '0.5rem' }}
                  />
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Navigation Links</label>
                {navLinks.map((link, i) => (
                  <div className="nav-link-row" key={i}>
                    <input
                      type="text"
                      className="form-input"
                      value={link.label}
                      onChange={(e) => updateNavLink(i, 'label', e.target.value)}
                      placeholder="Label"
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={link.url}
                      onChange={(e) => updateNavLink(i, 'url', e.target.value)}
                      placeholder="/shop/products"
                    />
                    <button className="btn btn-ghost btn-icon-sm" onClick={() => removeNavLink(i)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={addNavLink}>
                  <Plus size={14} /> Add Link
                </button>
              </div>
            </div>
          )}

          {activePanel === 'footer' && (
            <div className="builder-panel-content">
              <h3>Footer</h3>
              <div className="form-group">
                <label className="form-label">Copyright Text</label>
                <input
                  type="text"
                  className="form-input"
                  value={footerConfig.copyright || ''}
                  onChange={(e) => updateDraft({ footer_config: { ...footerConfig, copyright: e.target.value } } as any)}
                  placeholder="© 2026 Isobex Lasers. All rights reserved."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Link Columns</label>
                {(footerConfig.columns || []).map((col: any, ci: number) => (
                  <div className="footer-column-block" key={ci}>
                    <div className="footer-column-header">
                      <input
                        type="text"
                        className="form-input"
                        value={col.title}
                        onChange={(e) => updateFooterColumn(ci, e.target.value)}
                        placeholder="Column title"
                      />
                      <button className="btn btn-ghost btn-icon-sm" onClick={() => removeFooterColumn(ci)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {(col.links || []).map((link: any, li: number) => (
                      <div className="nav-link-row" key={li}>
                        <input
                          type="text"
                          className="form-input"
                          value={link.label}
                          onChange={(e) => updateFooterLink(ci, li, 'label', e.target.value)}
                          placeholder="Label"
                        />
                        <input
                          type="text"
                          className="form-input"
                          value={link.url}
                          onChange={(e) => updateFooterLink(ci, li, 'url', e.target.value)}
                          placeholder="URL"
                        />
                        <button className="btn btn-ghost btn-icon-sm" onClick={() => removeFooterLink(ci, li)}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button className="btn btn-ghost btn-sm" onClick={() => addFooterLink(ci)}>
                      <Plus size={12} /> Add Link
                    </button>
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={addFooterColumn}>
                  <Plus size={14} /> Add Column
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Social Media Links</label>
                {socialLinks.map((link, i) => (
                  <div className="nav-link-row" key={i}>
                    <select
                      className="form-input"
                      value={link.platform}
                      onChange={(e) => updateSocialLink(i, 'platform', e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="twitter">X / Twitter</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="youtube">YouTube</option>
                      <option value="tiktok">TikTok</option>
                    </select>
                    <input
                      type="text"
                      className="form-input"
                      value={link.url}
                      onChange={(e) => updateSocialLink(i, 'url', e.target.value)}
                      placeholder="https://..."
                    />
                    <button className="btn btn-ghost btn-icon-sm" onClick={() => removeSocialLink(i)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={addSocialLink}>
                  <Plus size={14} /> Add Social Link
                </button>
              </div>
            </div>
          )}

          {activePanel === 'homepage' && (
            <div className="builder-panel-content">
              <h3>Homepage Layout</h3>
              <div className="form-group">
                <label className="form-label">Hero Image URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={draft.hero_image_url || ''}
                  onChange={(e) => updateDraft({ hero_image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Hero Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={draft.hero_title || ''}
                  onChange={(e) => updateDraft({ hero_title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Hero Subtitle</label>
                <input
                  type="text"
                  className="form-input"
                  value={draft.hero_subtitle || ''}
                  onChange={(e) => updateDraft({ hero_subtitle: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CTA Button Text</label>
                  <input
                    type="text"
                    className="form-input"
                    value={draft.hero_cta_text || ''}
                    onChange={(e) => updateDraft({ hero_cta_text: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CTA Button Link</label>
                  <input
                    type="text"
                    className="form-input"
                    value={draft.hero_cta_link || ''}
                    onChange={(e) => updateDraft({ hero_cta_link: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {activePanel === 'seo' && (
            <div className="builder-panel-content">
              <h3>Default SEO Settings</h3>
              <p className="form-hint">These are the fallback meta tags for pages without specific SEO overrides.</p>
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
                  value={draft.seo_description || ''}
                  onChange={(e) => updateDraft({ seo_description: e.target.value })}
                  placeholder="Browse our range of precision laser equipment..."
                  rows={3}
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
            </div>
          )}

          {activePanel === 'shipping' && (
            <div className="builder-panel-content">
              <h3>Shipping Configuration</h3>
              <p className="form-hint">
                Configure weight-based shipping rates. Rates are matched by the total weight of the cart.
              </p>

              {shippingZones.map((zone) => {
                const zoneRates = shippingRates.filter((r) => r.zone_id === zone.id);
                return (
                  <div className="shipping-zone-block" key={zone.id}>
                    <div className="shipping-zone-header">
                      <h4>{zone.name}</h4>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingZoneId(editingZoneId === zone.id ? null : zone.id)}
                      >
                        {editingZoneId === zone.id ? 'Collapse' : 'Edit Rates'}
                      </button>
                    </div>

                    {editingZoneId === zone.id && (
                      <div className="shipping-rates-list">
                        {zoneRates.map((rate) => (
                          <div className="shipping-rate-row" key={rate.id}>
                            <div className="shipping-rate-fields">
                              <div className="form-group">
                                <label className="form-label">Name</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={rate.name}
                                  onChange={(e) => updateRate(rate.id, 'name', e.target.value)}
                                  onBlur={() => saveRate(rate)}
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Min Weight (kg)</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={rate.min_weight_kg}
                                  onChange={(e) => updateRate(rate.id, 'min_weight_kg', Number(e.target.value))}
                                  onBlur={() => saveRate(rate)}
                                  step="0.1"
                                  min="0"
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Max Weight (kg)</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={rate.max_weight_kg}
                                  onChange={(e) => updateRate(rate.id, 'max_weight_kg', Number(e.target.value))}
                                  onBlur={() => saveRate(rate)}
                                  step="0.1"
                                  min="0"
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Price (£)</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={rate.price}
                                  onChange={(e) => updateRate(rate.id, 'price', Number(e.target.value))}
                                  onBlur={() => saveRate(rate)}
                                  step="0.01"
                                  min="0"
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Est. Days</label>
                                <div className="est-days-row">
                                  <input
                                    type="number"
                                    className="form-input"
                                    value={rate.estimated_days_min}
                                    onChange={(e) => updateRate(rate.id, 'estimated_days_min', Number(e.target.value))}
                                    onBlur={() => saveRate(rate)}
                                    min="0"
                                  />
                                  <span>–</span>
                                  <input
                                    type="number"
                                    className="form-input"
                                    value={rate.estimated_days_max}
                                    onChange={(e) => updateRate(rate.id, 'estimated_days_max', Number(e.target.value))}
                                    onBlur={() => saveRate(rate)}
                                    min="0"
                                  />
                                </div>
                              </div>
                              <div className="form-group shipping-rate-actions">
                                <label className="form-label">&nbsp;</label>
                                <button
                                  className="btn btn-ghost btn-icon-sm danger"
                                  onClick={() => deleteRate(rate.id)}
                                  title="Delete rate"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button className="btn btn-secondary btn-sm" onClick={() => addShippingRate(zone.id)}>
                          <Plus size={14} /> Add Rate
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {shippingZones.length === 0 && (
                <div className="builder-empty-hint">
                  No shipping zones configured. Run the store-schema-phase2.sql to create the default UK zone.
                </div>
              )}
            </div>
          )}

          {activePanel === 'domain' && (
            <div className="builder-panel-content">
              <h3>Custom Domain</h3>
              <p className="form-hint">
                Connect your store to a custom domain. Point your domain's CNAME record to your Vercel deployment URL.
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
                <div className="domain-instructions">
                  <h4>DNS Setup Instructions</h4>
                  <ol>
                    <li>Go to your domain provider's DNS settings</li>
                    <li>Add a <strong>CNAME</strong> record:</li>
                  </ol>
                  <div className="dns-record">
                    <div><strong>Type:</strong> CNAME</div>
                    <div><strong>Name:</strong> {draft.custom_domain?.split('.')[0] || 'shop'}</div>
                    <div><strong>Value:</strong> cname.vercel-dns.com</div>
                  </div>
                  <ol start={3}>
                    <li>Add <strong>{draft.custom_domain}</strong> as a custom domain in your Vercel project settings</li>
                    <li>Vercel will automatically provision SSL</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Live preview */}
          <div className="builder-preview">
            <div className="preview-frame">
              <div className="preview-header" style={{ backgroundColor: (draft as any).color_primary || '#2563eb' }}>
                <div className="preview-logo" style={{ fontFamily: draft.font_heading || 'Inter' }}>
                  {draft.store_name || 'My Store'}
                </div>
                <div className="preview-nav">
                  {navLinks.filter(l => l.label).map((l, i) => (
                    <span key={i} className="preview-nav-link">{l.label}</span>
                  ))}
                </div>
              </div>
              <div
                className="preview-body"
                style={{
                  backgroundColor: (draft as any).color_background || '#ffffff',
                  color: (draft as any).color_text || '#0f172a',
                  fontFamily: draft.font_body || 'Inter',
                }}
              >
                <div
                  className="preview-hero"
                  style={{
                    backgroundImage: draft.hero_image_url ? `url(${draft.hero_image_url})` : undefined,
                    backgroundColor: !draft.hero_image_url ? (draft as any).color_secondary || '#1e40af' : undefined,
                  }}
                >
                  <h2 style={{ fontFamily: draft.font_heading || 'Inter' }}>
                    {draft.hero_title || 'Welcome'}
                  </h2>
                  {draft.hero_subtitle && <p>{draft.hero_subtitle}</p>}
                  <button
                    className="preview-cta"
                    style={{ backgroundColor: (draft as any).color_accent || '#f59e0b' }}
                  >
                    {draft.hero_cta_text || 'Shop Now'}
                  </button>
                </div>
                <div className="preview-products">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="preview-product-card"
                      style={{ backgroundColor: (draft as any).color_surface || '#f8fafc' }}
                    >
                      <div className="preview-product-image" />
                      <span>Product {n}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div
                className="preview-footer"
                style={{
                  backgroundColor: (draft as any).color_text || '#0f172a',
                  color: (draft as any).color_background || '#ffffff',
                }}
              >
                <span>{footerConfig.copyright || `© ${new Date().getFullYear()} ${draft.store_name}`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
