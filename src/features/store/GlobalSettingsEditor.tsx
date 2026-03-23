import { useState, useEffect } from 'react';
import * as api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { StoreConfig, ShippingZone, ShippingRate } from '@/types/database';
import { Plus, Trash2, Upload } from 'lucide-react';
import { ColorPicker } from '@/components/ui/ColorPicker';

interface Props {
  panel: string;
  draft: Partial<StoreConfig>;
  updateDraft: (updates: Partial<StoreConfig>) => void;
}

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Outfit', 'Raleway', 'Nunito', 'Playfair Display', 'Oswald',
  'Source Sans 3', 'DM Sans', 'Space Grotesk', 'Manrope', 'Sora',
];

export function GlobalSettingsEditor({ panel, draft, updateDraft }: Props) {
  // Shipping state
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);

  useEffect(() => {
    if (panel === 'shipping') {
      Promise.all([api.fetchShippingZones(), api.fetchShippingRates()]).then(([zones, rates]) => {
        setShippingZones(zones);
        setShippingRates(rates);
      }).catch(console.error);
    }
  }, [panel]);

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
  const moveNavLink = (index: number, dir: -1 | 1) => {
    if (index + dir < 0 || index + dir >= navLinks.length) return;
    const updated = [...navLinks];
    const temp = updated[index];
    updated[index] = updated[index + dir];
    updated[index + dir] = temp;
    updateDraft({ header_layout: { ...headerLayout, nav_links: updated } } as any);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ext = file.name.split('.').pop();
      const fileName = `logos/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('store-assets').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('store-assets').getPublicUrl(fileName);
      updateDraft({ logo_url: publicUrl });
    } catch (err) {
      console.error('Logo upload failed:', err);
    }
  };

  // ─── Footer helpers ───────────────────
  const footerConfig = (draft as any)?.footer_config || { columns: [], social_links: [], copyright: '' };
  
  const addFooterColumn = () => {
    const updated = { ...footerConfig, columns: [...(footerConfig.columns || []), { title: '', links: [] }] };
    updateDraft({ footer_config: updated } as any);
  };
  const updateFooterColumn = (index: number, title: string) => {
    const updated = {
      ...footerConfig,
      columns: footerConfig.columns.map((c: any, i: number) => i === index ? { ...c, title } : c),
    };
    updateDraft({ footer_config: updated } as any);
  };
  const removeFooterColumn = (index: number) => {
    const updated = { ...footerConfig, columns: footerConfig.columns.filter((_: any, i: number) => i !== index) };
    updateDraft({ footer_config: updated } as any);
  };

  const addFooterLink = (colIndex: number) => {
    const cols = [...footerConfig.columns];
    cols[colIndex].links = [...(cols[colIndex].links || []), { label: '', url: '' }];
    updateDraft({ footer_config: { ...footerConfig, columns: cols } } as any);
  };
  const updateFooterLink = (colIndex: number, linkIndex: number, field: 'label' | 'url', value: string) => {
    const cols = [...footerConfig.columns];
    cols[colIndex].links = cols[colIndex].links.map((l: any, i: number) => i === linkIndex ? { ...l, [field]: value } : l);
    updateDraft({ footer_config: { ...footerConfig, columns: cols } } as any);
  };
  const removeFooterLink = (colIndex: number, linkIndex: number) => {
    const cols = [...footerConfig.columns];
    cols[colIndex].links = cols[colIndex].links.filter((_: any, i: number) => i !== linkIndex);
    updateDraft({ footer_config: { ...footerConfig, columns: cols } } as any);
  };

  const socialLinks: { platform: string; url: string }[] = footerConfig.social_links || [];
  const addSocialLink = () => {
    const updated = { ...footerConfig, social_links: [...socialLinks, { platform: '', url: '' }] };
    updateDraft({ footer_config: updated } as any);
  };
  const updateSocialLink = (index: number, field: 'platform' | 'url', value: string) => {
    const updated = {
      ...footerConfig,
      social_links: socialLinks.map((l, i) => i === index ? { ...l, [field]: value } : l),
    };
    updateDraft({ footer_config: updated } as any);
  };
  const removeSocialLink = (index: number) => {
    const updated = { ...footerConfig, social_links: socialLinks.filter((_, i) => i !== index) };
    updateDraft({ footer_config: updated } as any);
  };

  // ─── Shipping helpers ─────────────────
  const addShippingRate = async (zoneId: string) => {
    try {
      const newRate = await api.createShippingRate({
        zone_id: zoneId,
        name: 'Standard Delivery',
        price: 5.0,
        min_weight_kg: 0,
        max_weight_kg: null as any,
        estimated_days_min: 3,
        estimated_days_max: 5,
        sort_order: 0,
        is_active: true,
      });
      setShippingRates([...shippingRates, newRate]);
    } catch (err) {
      console.error(err);
    }
  };
  const saveRate = async (rate: ShippingRate) => {
    try {
      await api.updateShippingRate(rate.id, rate);
    } catch (err) {
      console.error(err);
    }
  };
  const updateRate = (id: string, field: string, value: any) => {
    setShippingRates(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  const deleteRate = async (id: string) => {
    try {
      await api.deleteShippingRate(id);
      setShippingRates(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };


  if (panel === 'brand') {
    return (
      <div className="builder-panel-content">
        <div className="form-group">
          <label className="form-label">Store Name</label>
          <input type="text" className="form-input" value={draft.store_name || ''} onChange={(e) => updateDraft({ store_name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Tagline</label>
          <input type="text" className="form-input" value={draft.tagline || ''} onChange={(e) => updateDraft({ tagline: e.target.value })} placeholder="Precision laser tech..." />
        </div>
        <div className="form-group">
          <label className="form-label">Logo URL</label>
          <input type="text" className="form-input" value={draft.logo_url || ''} onChange={(e) => updateDraft({ logo_url: e.target.value })} placeholder="https://..." />
        </div>
        <div className="form-group">
          <label className="form-label">Favicon URL</label>
          <input type="text" className="form-input" value={draft.favicon_url || ''} onChange={(e) => updateDraft({ favicon_url: e.target.value })} placeholder="https://..." />
        </div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Currency Symbol</label>
            <input type="text" className="form-input" value={draft.currency_symbol || '£'} onChange={(e) => updateDraft({ currency_symbol: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Currency Code</label>
            <input type="text" className="form-input" value={draft.currency_code || 'GBP'} onChange={(e) => updateDraft({ currency_code: e.target.value })} />
          </div>
        </div>
      </div>
    );
  }

  if (panel === 'colours') {
    return (
      <div className="builder-panel-content">
        <div className="ub-settings-card">
          <div className="ub-settings-card-header">
            <h3 className="ub-settings-card-title">Theme Colours</h3>
            <p className="ub-settings-card-desc">Set the colours used throughout your storefront.</p>
          </div>
          {[
            { key: 'color_primary', label: 'Primary' },
            { key: 'color_secondary', label: 'Secondary' },
            { key: 'color_accent', label: 'Accent' },
            { key: 'color_background', label: 'Background' },
            { key: 'color_surface', label: 'Surface' },
            { key: 'color_text', label: 'Text' },
            { key: 'color_text_secondary', label: 'Text Secondary' },
          ].map(({ key, label }) => (
            <div className="form-group" key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>{label}</label>
              <ColorPicker value={(draft as any)[key] || '#000000'} onChange={(val) => updateDraft({ [key]: val } as any)} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (panel === 'typography') {
    return (
      <div className="builder-panel-content">
        <div className="ub-settings-card">
          <div className="ub-settings-card-header">
            <h3 className="ub-settings-card-title">Global Typography</h3>
          </div>
          <div className="form-group">
            <label className="form-label">Heading Font</label>
            <select className="form-input" value={draft.font_heading || 'Inter'} onChange={(e) => updateDraft({ font_heading: e.target.value })}>
              {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Body Font</label>
            <select className="form-input" value={draft.font_body || 'Inter'} onChange={(e) => updateDraft({ font_body: e.target.value })}>
              {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  }

  if (panel === 'header') {
    return (
      <div className="builder-panel-content">
        <div className="ub-settings-card">
          <div className="ub-settings-card-header">
            <h3 className="ub-settings-card-title">Logo Settings</h3>
          </div>
          
          <div className="form-group">
            <label className="form-label" style={{ marginBottom: 8 }}>Store Logo</label>
            <label className="ub-logo-upload-zone">
              {draft.logo_url ? (
                <>
                  <img src={draft.logo_url} alt="Logo" className="ub-logo-preview" />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Click to replace logo</span>
                </>
              ) : (
                <>
                  <Upload size={24} color="var(--text-tertiary)" style={{ marginBottom: 12 }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>Drop your logo here, or browse</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>Supports PNG, JPG, or SVG</span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </label>
            {draft.logo_url && (
               <button className="btn btn-ghost danger btn-sm" style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }} onClick={() => updateDraft({ logo_url: null })}>Remove Logo</button>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Logo Position</label>
            <select className="form-input" value={headerLayout.logo_position} onChange={(e) => updateDraft({ header_layout: { ...headerLayout, logo_position: e.target.value } } as any)}>
              <option value="left">Left</option>
              <option value="center">Center</option>
            </select>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Desktop Width (px)</label>
              <input type="number" className="form-input" value={headerLayout.logo_width_desktop || 150} onChange={(e) => updateDraft({ header_layout: { ...headerLayout, logo_width_desktop: Number(e.target.value) } } as any)} />
            </div>
            <div className="form-group">
              <label className="form-label">Mobile Width (px)</label>
              <input type="number" className="form-input" value={headerLayout.logo_width_mobile || 120} onChange={(e) => updateDraft({ header_layout: { ...headerLayout, logo_width_mobile: Number(e.target.value) } } as any)} />
            </div>
          </div>
        </div>

        <div className="ub-settings-card">
          <div className="ub-settings-card-header">
            <h3 className="ub-settings-card-title">Header Styling</h3>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group color-field">
              <label className="form-label">Background Color</label>
              <div className="color-input-wrap">
                <ColorPicker value={headerLayout.bg_color || '#ffffff'} onChange={(val) => updateDraft({ header_layout: { ...headerLayout, bg_color: val } } as any)} />
              </div>
            </div>
            <div className="form-group color-field">
              <label className="form-label">Navigation Color</label>
              <div className="color-input-wrap">
                <ColorPicker value={headerLayout.nav_color || '#000000'} onChange={(val) => updateDraft({ header_layout: { ...headerLayout, nav_color: val } } as any)} />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Navigation Font</label>
            <select className="form-input" value={headerLayout.nav_font || 'inherit'} onChange={(e) => updateDraft({ header_layout: { ...headerLayout, nav_font: e.target.value } } as any)}>
              <option value="inherit">Use Theme Body Font</option>
              {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Cart Icon Style</label>
              <select className="form-input" value={headerLayout.cart_icon_type || 'ShoppingCart'} onChange={(e) => updateDraft({ header_layout: { ...headerLayout, cart_icon_type: e.target.value } } as any)}>
                <option value="ShoppingCart">Cart</option>
                <option value="ShoppingBag">Bag</option>
                <option value="ShoppingBasket">Basket</option>
              </select>
            </div>
            <div className="form-group color-field">
              <label className="form-label">Cart Icon Color</label>
              <div className="color-input-wrap">
                <ColorPicker value={headerLayout.cart_icon_color || '#000000'} onChange={(val) => updateDraft({ header_layout: { ...headerLayout, cart_icon_color: val } } as any)} />
              </div>
            </div>
          </div>
        </div>

        <div className="ub-settings-card">
          <div className="ub-settings-card-header">
            <h3 className="ub-settings-card-title">Navigation Links</h3>
          </div>
          
          <div className="form-group">
            {/* Static Uneditable Links */}
            <div className="ub-settings-item-box" style={{ opacity: 0.7 }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="text" className="form-input" disabled value="Home" style={{ width: '40%' }} />
                <input type="text" className="form-input" disabled value="/shop" style={{ flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="text" className="form-input" disabled value="Products" style={{ width: '40%' }} />
                <input type="text" className="form-input" disabled value="/shop/products" style={{ flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" className="form-input" disabled value="Collections" style={{ width: '40%' }} />
                <input type="text" className="form-input" disabled value="/shop/collections" style={{ flex: 1 }} />
              </div>
            </div>

            {/* Custom Editable Links */}
            {navLinks.map((link, i) => (
              <div key={i} className="ub-settings-item-box" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <input type="text" className="form-input" value={link.label} onChange={(e) => updateNavLink(i, 'label', e.target.value)} placeholder="Label" style={{ width: '100%', marginBottom: '0.5rem' }} />
                  <input type="text" className="form-input" value={link.url} onChange={(e) => updateNavLink(i, 'url', e.target.value)} placeholder="/shop/products" style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className="btn btn-ghost btn-icon-sm" onClick={() => moveNavLink(i, -1)} disabled={i === 0}>↑</button>
                    <button className="btn btn-ghost btn-icon-sm" onClick={() => moveNavLink(i, 1)} disabled={i === navLinks.length - 1}>↓</button>
                  </div>
                  <button className="btn btn-ghost btn-icon-sm danger" onClick={() => removeNavLink(i)} style={{ width: '100%', color: '#ef4444' }}>✕</button>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={addNavLink} style={{ marginTop: '0.5rem', width: '100%' }}><Plus size={14} style={{ marginRight: 6 }}/> Add Custom Link</button>
          </div>
        </div>

        <div className="ub-settings-card">
          <div className="ub-settings-card-header">
            <h3 className="ub-settings-card-title">Announcement Bar</h3>
          </div>
          
          <div className="form-group">
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer', fontSize: '0.8125rem' }}>
              <input type="checkbox" checked={draft.announcement_bar_active ?? false} onChange={(e) => updateDraft({ announcement_bar_active: e.target.checked })} />
              <span>Enable Announcement Bar</span>
            </label>
          </div>

          {draft.announcement_bar_active && (
            <>
              <div className="form-group">
                <label className="form-label">Style Effect</label>
                <select className="form-input" value={headerLayout.announcement_type || 'static'} onChange={(e) => updateDraft({ header_layout: { ...headerLayout, announcement_type: e.target.value } } as any)}>
                  <option value="static">Static Centered Text</option>
                  <option value="ticker">Scrolling Ticker Banner</option>
                </select>
              </div>

              {headerLayout.announcement_type === 'ticker' ? (
                 <div className="form-group">
                    <label className="form-label" style={{ marginBottom: 8 }}>Ticker Messages</label>
                    {(headerLayout.ticker_messages || []).map((msg: string, i: number) => (
                      <div key={i} className="ub-settings-item-box" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input className="form-input" style={{ flex: 1, minWidth: 0 }} value={msg} onChange={(e) => {
                             const msgs = [...(headerLayout.ticker_messages || [])];
                             msgs[i] = e.target.value;
                             updateDraft({ header_layout: { ...headerLayout, ticker_messages: msgs } } as any);
                          }} placeholder="Add message..." />
                          <div style={{ display: 'flex', flexShrink: 0 }}>
                             <button className="btn btn-ghost btn-icon-sm danger" onClick={() => {
                                const msgs = [...(headerLayout.ticker_messages || [])];
                                msgs.splice(i, 1);
                                updateDraft({ header_layout: { ...headerLayout, ticker_messages: msgs } } as any);
                             }} title="Remove message">✕</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                       const msgs = [...(headerLayout.ticker_messages || []), ''];
                       updateDraft({ header_layout: { ...headerLayout, ticker_messages: msgs } } as any);
                    }} style={{ width: '100%' }}><Plus size={14} style={{ marginRight: 6 }}/> Add Message</button>
                    
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
                      <div className="form-group">
                         <label className="form-label" title="Seconds for one full scroll. Higher = Slower">Speed (Seconds)</label>
                         <input type="number" className="form-input" min={5} step={1} value={headerLayout.ticker_speed_seconds || 15} onChange={(e) => updateDraft({ header_layout: { ...headerLayout, ticker_speed_seconds: Math.max(1, Number(e.target.value)) } } as any)} />
                      </div>
                      <div className="form-group">
                         <label className="form-label" title="Space between repeating messages">Spacing (px)</label>
                         <input type="number" className="form-input" min={0} step={10} value={headerLayout.ticker_spacing_px || 40} onChange={(e) => updateDraft({ header_layout: { ...headerLayout, ticker_spacing_px: Math.max(0, Number(e.target.value)) } } as any)} />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                         <label className="form-label" title="How many times the message loop is copied to fill wide screens">Repeats (Density)</label>
                         <input type="number" className="form-input" min={2} max={10} step={1} value={headerLayout.ticker_repeats || 4} onChange={(e) => updateDraft({ header_layout: { ...headerLayout, ticker_repeats: Math.max(2, Math.min(10, Number(e.target.value))) } } as any)} />
                      </div>
                    </div>
                 </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Message Text</label>
                  <input type="text" className="form-input" value={draft.announcement_bar_text || ''} onChange={(e) => updateDraft({ announcement_bar_text: e.target.value })} placeholder="Free shipping on orders over $50" />
                </div>
              )}

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group color-field">
                  <label className="form-label">Background Color</label>
                  <div className="color-input-wrap">
                    <ColorPicker value={headerLayout.announcement_bg || '#111827'} onChange={(val) => updateDraft({ header_layout: { ...headerLayout, announcement_bg: val } } as any)} />
                  </div>
                </div>
                <div className="form-group color-field">
                  <label className="form-label">Text Color</label>
                  <div className="color-input-wrap">
                    <ColorPicker value={headerLayout.announcement_color || '#ffffff'} onChange={(val) => updateDraft({ header_layout: { ...headerLayout, announcement_color: val } } as any)} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (panel === 'footer') {
    return (
      <div className="builder-panel-content">
        <div className="ub-settings-card">
          <div className="ub-settings-card-header">
            <h3 className="ub-settings-card-title">Footer Configuration</h3>
          </div>
          
          <div className="form-group">
            <label className="form-label">Copyright Text</label>
            <input type="text" className="form-input" value={footerConfig.copyright || ''} onChange={(e) => updateDraft({ footer_config: { ...footerConfig, copyright: e.target.value } } as any)} placeholder="© 2026 Isobex Lasers." />
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label className="form-label" style={{ marginBottom: 8 }}>Link Columns</label>
            {(footerConfig.columns || []).map((col: any, ci: number) => (
              <div key={ci} className="ub-settings-item-box">
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input type="text" className="form-input" value={col.title} onChange={(e) => updateFooterColumn(ci, e.target.value)} placeholder="Column title" style={{ flex: 1 }} />
                  <button className="btn btn-ghost btn-icon-sm danger" onClick={() => removeFooterColumn(ci)}><Trash2 size={16} color="#ef4444" /></button>
                </div>
                {(col.links || []).map((link: any, li: number) => (
                  <div key={li} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <input type="text" className="form-input" value={link.label} onChange={(e) => updateFooterLink(ci, li, 'label', e.target.value)} placeholder="Label" style={{ width: '40%' }} />
                    <input type="text" className="form-input" value={link.url} onChange={(e) => updateFooterLink(ci, li, 'url', e.target.value)} placeholder="URL" style={{ flex: 1 }} />
                    <div style={{ display: 'flex', flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-icon-sm danger" onClick={() => removeFooterLink(ci, li)}>✕</button>
                    </div>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => addFooterLink(ci)} style={{ marginTop: '0.5rem' }}><Plus size={14} style={{ marginRight: 6 }}/> Add Link</button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '0.5rem' }} onClick={addFooterColumn}><Plus size={14} style={{ marginRight: 6 }}/> Add Column</button>
          </div>
        </div>

        <div className="ub-settings-card">
          <div className="ub-settings-card-header">
            <h3 className="ub-settings-card-title">Social Media Links</h3>
          </div>
          <div className="form-group">
            {socialLinks.map((link, i) => (
              <div key={i} className="ub-settings-item-box" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', padding: '0.75rem' }}>
                <select className="form-input" style={{ width: '35%' }} value={link.platform} onChange={(e) => updateSocialLink(i, 'platform', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">X / Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                </select>
                <input type="text" className="form-input" style={{ flex: 1, minWidth: 0 }} value={link.url} onChange={(e) => updateSocialLink(i, 'url', e.target.value)} placeholder="https://..." />
                <div style={{ display: 'flex', flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-icon-sm danger" onClick={() => removeSocialLink(i)}>✕</button>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '0.5rem' }} onClick={addSocialLink}><Plus size={14} style={{ marginRight: 6 }}/> Add Social Link</button>
          </div>
        </div>
      </div>
    );
  }

  if (panel === 'seo') {
    return (
      <div className="builder-panel-content">
        <div className="ub-settings-card">
          <div className="ub-settings-card-header">
            <h3 className="ub-settings-card-title">Search Engine Optimization</h3>
            <p className="ub-settings-card-desc">Default fallbacks for pages without specific SEO overrides.</p>
          </div>
          <div className="form-group">
            <label className="form-label">Meta Title</label>
            <input type="text" className="form-input" value={draft.seo_title || ''} onChange={(e) => updateDraft({ seo_title: e.target.value })} placeholder="Isobex Lasers — Premium Laser Equipment" />
          </div>
          <div className="form-group">
            <label className="form-label">Meta Description</label>
            <textarea className="form-input form-textarea" rows={3} value={draft.seo_description || ''} onChange={(e) => updateDraft({ seo_description: e.target.value })} placeholder="Browse our range of precision laser equipment..." />
          </div>
          <div className="form-group">
            <label className="form-label">Social Share Image URL</label>
            <input type="text" className="form-input" value={draft.seo_image_url || ''} onChange={(e) => updateDraft({ seo_image_url: e.target.value })} placeholder="https://..." />
          </div>
        </div>
      </div>
    );
  }

  if (panel === 'shipping') {
    return (
      <div className="builder-panel-content">
        <div className="ub-settings-card">
          <div className="ub-settings-card-header">
            <h3 className="ub-settings-card-title">Shipping Zones</h3>
            <p className="ub-settings-card-desc">Configure weight-based shipping rates.</p>
          </div>
          <div className="form-group">
            {shippingZones.map((zone) => {
              const zoneRates = shippingRates.filter((r) => r.zone_id === zone.id);
              return (
                <div key={zone.id} className="ub-settings-item-box" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: editingZoneId === zone.id ? 'var(--surface-100)' : 'transparent', borderBottom: editingZoneId === zone.id ? '1px solid var(--border-color)' : 'none' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{zone.name}</h4>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingZoneId(editingZoneId === zone.id ? null : zone.id)}>
                      {editingZoneId === zone.id ? 'Collapse' : 'Edit Rates'}
                    </button>
                  </div>

                  {editingZoneId === zone.id && (
                    <div style={{ padding: '1rem' }}>
                      {zoneRates.map((rate) => (
                        <div key={rate.id} style={{ padding: '1rem', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                          <div className="form-group">
                            <label className="form-label">Rate Name</label>
                            <input type="text" className="form-input" value={rate.name} onChange={(e) => updateRate(rate.id, 'name', e.target.value)} onBlur={() => saveRate(rate)} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div className="form-group">
                              <label className="form-label">Min Wt (kg)</label>
                              <input type="number" className="form-input" value={rate.min_weight_kg || 0} onChange={(e) => updateRate(rate.id, 'min_weight_kg', Number(e.target.value))} onBlur={() => saveRate(rate)} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Max Wt (kg)</label>
                              <input type="number" className="form-input" value={rate.max_weight_kg || ''} onChange={(e) => updateRate(rate.id, 'max_weight_kg', e.target.value === '' ? null : Number(e.target.value))} onBlur={() => saveRate(rate)} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label">Price (£)</label>
                              <input type="number" className="form-input" value={rate.price} onChange={(e) => updateRate(rate.id, 'price', Number(e.target.value))} onBlur={() => saveRate(rate)} />
                            </div>
                            <button className="btn btn-ghost btn-icon-sm danger" onClick={() => deleteRate(rate.id)} style={{ marginBottom: 4 }}>✕</button>
                          </div>
                        </div>
                      ))}
                      <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => addShippingRate(zone.id)}><Plus size={14} style={{ marginRight: 6 }}/> Add Rate</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (panel === 'domain') {
    return (
      <div className="builder-panel-content">
        <p className="form-hint" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Connect your store to a custom domain by pointing your domain's CNAME record to your Vercel URL.</p>
        <div className="form-group">
          <label className="form-label">Custom Domain</label>
          <input type="text" className="form-input" value={draft.custom_domain || ''} onChange={(e) => updateDraft({ custom_domain: e.target.value })} placeholder="shop.isobex.co.uk" />
        </div>
        {draft.custom_domain && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-surface)', borderRadius: '6px', fontSize: '0.875rem' }}>
            <h4 style={{ margin: '0 0 0.5rem' }}>DNS Setup Instructions</h4>
            <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
              <li>Go to your domain provider's DNS settings</li>
              <li>Add a <strong>CNAME</strong> record: 
                <br />Name: {draft.custom_domain?.split('.')[0] || 'shop'}
                <br />Value: cname.vercel-dns.com
              </li>
              <li>Add <strong>{draft.custom_domain}</strong> to your Vercel project</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  // Not implemented or unknown panel falls back to this message
  return <p className="form-hint" style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Settings form for {panel} goes here.</p>;
}
