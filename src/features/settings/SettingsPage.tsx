import { useState, useEffect } from 'react';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { PageShell } from '@/components/layout/PageShell';
import { useData } from '@/context/DataContext';
import { supabase } from '@/lib/supabase';
import * as api from '@/lib/api';
import type { LookupItem } from '@/types/database';
import { useAlert } from '@/components/ui/AlertDialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Plus, Pencil, Trash2, X, Check, Mail, Save, Send, Loader2,
  CheckCircle2, Info, ListFilter, Building2, Star, CreditCard, Activity, Copy, MessageSquare, Users,
  Shield, Crosshair, Phone
} from 'lucide-react';
import type { ExcludedIp } from '@/types/database';
import type { BusinessProfile } from '@/types/database';
import { SmsPanel } from './SmsPanel';
import { PhonePanel } from './PhonePanel';
import { TeamPanel } from './TeamPanel';
import './SettingsPage.css';

/* ═══════════════════════════════════════════
   Settings Page — Tabbed Layout
   ═══════════════════════════════════════════ */

const TABS = [
  { id: 'business', label: 'Business Profile', icon: Building2 },
  { id: 'lookups', label: 'Lookups', icon: ListFilter },
  { id: 'email', label: 'Email / SMTP', icon: Mail },
  { id: 'sms', label: 'SMS Provider', icon: MessageSquare },
  { id: 'phone', label: 'Phone Numbers', icon: Phone },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  // { id: 'google', label: 'Google', icon: Star }, // Hidden until business is accepted on Google Places
  { id: 'tracking', label: 'Tracking Pixel', icon: Activity },
  { id: 'team', label: 'Team', icon: Users },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('business');

  return (
    <PageShell
      title="Settings"
      subtitle="Configure dropdown lists, email and system preferences."
    >
      <div className="settings-shell">
        {/* Sidebar navigation */}
        <nav className="settings-sidebar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`settings-sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Panel content */}
        <div className="settings-panel" key={activeTab}>
          {activeTab === 'business' && <BusinessProfilePanel />}
          {activeTab === 'lookups' && <LookupsPanel />}
          {activeTab === 'email' && <SmtpPanel />}
          {activeTab === 'sms' && <SmsPanel />}
          {activeTab === 'phone' && <PhonePanel />}
          {activeTab === 'payments' && <PaymentsPanel />}
          {/* {activeTab === 'google' && <GooglePanel />} */}
          {activeTab === 'tracking' && <TrackingPanel />}
          {activeTab === 'team' && <TeamPanel />}
        </div>
      </div>
    </PageShell>
  );
}

/* ═══════════════════════════════════════════
   Business Profile Panel
   ═══════════════════════════════════════════ */

const EMPTY_PROFILE: Omit<BusinessProfile, 'id' | 'created_at' | 'updated_at'> = {
  business_name: '',
  business_email: '',
  business_phone: '',
  business_website: '',
  business_address_line_1: '',
  business_address_line_2: '',
  business_city: '',
  business_county: '',
  business_postcode: '',
  business_country: 'United Kingdom',
  vat_number: '',
};

function BusinessProfilePanel() {
  const { showAlert } = useAlert();
  const [form, setForm] = useState({ ...EMPTY_PROFILE });
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('business_profile')
          .select('*')
          .limit(1)
          .single();
        if (!error && data) {
          const p = data as BusinessProfile;
          setProfileId(p.id);
          setForm({
            business_name: p.business_name || '',
            business_email: p.business_email || '',
            business_phone: p.business_phone || '',
            business_website: p.business_website || '',
            business_address_line_1: p.business_address_line_1 || '',
            business_address_line_2: p.business_address_line_2 || '',
            business_city: p.business_city || '',
            business_county: p.business_county || '',
            business_postcode: p.business_postcode || '',
            business_country: p.business_country || 'United Kingdom',
            vat_number: p.vat_number || '',
          });
        }
      } catch (err) {
        console.error('Failed to load business profile:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, updated_at: new Date().toISOString() };
      if (profileId) {
        const { error } = await supabase.from('business_profile').update(payload).eq('id', profileId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('business_profile').insert(payload).select().single();
        if (error) throw error;
        if (data) setProfileId(data.id);
      }
      setDirty(false);
      showAlert({ title: 'Saved', message: 'Business profile updated successfully.', variant: 'success' });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Failed to save';
      showAlert({ title: 'Error', message: msg, variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="settings-panel-head">
          <h3>Business Profile</h3>
          <p className="settings-panel-desc">Loading…</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <div className="loading-spinner" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="settings-panel-head">
        <h3>Business Profile</h3>
        <p className="settings-panel-desc">
          Your business details are used in email merge tags and across the CRM.
        </p>
      </div>

      <div className="settings-integration-card connected">
        <div className="settings-integration-icon">
          <Building2 size={24} />
        </div>
        <div className="settings-integration-info">
          <h4>{form.business_name || 'Your Business'}</h4>
          <p>{form.business_email || 'Set your business email below'}</p>
        </div>
      </div>

      {/* Company Details */}
      <div className="settings-section">
        <div className="settings-section-title">Company Details</div>
        <div className="smtp-field-row">
          <div className="smtp-field">
            <label className="smtp-field-label">Business Name</label>
            <input className="smtp-field-input" value={form.business_name} onChange={e => handleChange('business_name', e.target.value)} placeholder="Isobex Lasers" />
          </div>
          <div className="smtp-field">
            <label className="smtp-field-label">Website</label>
            <input className="smtp-field-input" value={form.business_website} onChange={e => handleChange('business_website', e.target.value)} placeholder="https://isobexlasers.com" />
          </div>
        </div>
        <div className="smtp-field-row">
          <div className="smtp-field">
            <label className="smtp-field-label">Email</label>
            <input className="smtp-field-input" type="email" value={form.business_email} onChange={e => handleChange('business_email', e.target.value)} placeholder="info@isobexlasers.com" />
          </div>
          <div className="smtp-field">
            <label className="smtp-field-label">Phone</label>
            <input className="smtp-field-input" value={form.business_phone} onChange={e => handleChange('business_phone', e.target.value)} placeholder="+44 1234 567890" />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="settings-section">
        <div className="settings-section-title">Address</div>
        <div className="smtp-field-row">
          <div className="smtp-field">
            <label className="smtp-field-label">Address Line 1</label>
            <input className="smtp-field-input" value={form.business_address_line_1} onChange={e => handleChange('business_address_line_1', e.target.value)} placeholder="123 Industrial Way" />
          </div>
          <div className="smtp-field">
            <label className="smtp-field-label">Address Line 2</label>
            <input className="smtp-field-input" value={form.business_address_line_2} onChange={e => handleChange('business_address_line_2', e.target.value)} placeholder="Unit 4" />
          </div>
        </div>
        <div className="smtp-field-row">
          <div className="smtp-field">
            <label className="smtp-field-label">City</label>
            <input className="smtp-field-input" value={form.business_city} onChange={e => handleChange('business_city', e.target.value)} placeholder="Sheffield" />
          </div>
          <div className="smtp-field">
            <label className="smtp-field-label">County</label>
            <input className="smtp-field-input" value={form.business_county} onChange={e => handleChange('business_county', e.target.value)} placeholder="South Yorkshire" />
          </div>
        </div>
        <div className="smtp-field-row">
          <div className="smtp-field">
            <label className="smtp-field-label">Postcode</label>
            <input className="smtp-field-input" value={form.business_postcode} onChange={e => handleChange('business_postcode', e.target.value)} placeholder="S1 1AA" />
          </div>
          <div className="smtp-field">
            <label className="smtp-field-label">Country</label>
            <input className="smtp-field-input" value={form.business_country} onChange={e => handleChange('business_country', e.target.value)} placeholder="United Kingdom" />
          </div>
        </div>
        <div className="smtp-field-row">
          <div className="smtp-field">
            <label className="smtp-field-label">VAT Number</label>
            <input className="smtp-field-input" value={form.vat_number || ''} onChange={e => handleChange('vat_number', e.target.value)} placeholder="GB 123 4567 89" />
          </div>
          <div className="smtp-field"></div>
        </div>
      </div>

      <div className="smtp-info-box">
        <Info size={14} />
        <span>
          These details are used as merge tags in email campaigns (e.g. <code>{'{{business_name}}'}</code>, <code>{'{{business_email}}'}</code>).
          Update them here and they'll be automatically used when sending emails.
        </span>
      </div>

      <div className="settings-form-actions">
        <button className="btn-brand" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? <><Loader2 size={16} className="spin" /> Saving…</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   Lookups Panel (existing lookup cards)
   ═══════════════════════════════════════════ */

type LookupTable = 'lead_sources' | 'lead_statuses' | 'company_statuses' | 'product_labels' | 'compatibility_types';
type CollectionKey = 'leadSources' | 'leadStatuses' | 'companyStatuses' | 'productLabels' | 'compatibilityTypes';

interface LookupCardProps {
  title: string;
  table: LookupTable;
  collection: CollectionKey;
  items: LookupItem[];
  hasColor?: boolean;
}

function LookupsPanel() {
  const { state } = useData();

  return (
    <>
      <div className="settings-panel-head">
        <h3>Lookups</h3>
        <p className="settings-panel-desc">
          Manage dropdown lists used across the CRM — lead sources, statuses, labels and more.
        </p>
      </div>

      <div className="settings-grid">
        <LookupCard
          title="Lead Sources"
          table="lead_sources"
          collection="leadSources"
          items={state.leadSources}
        />
        <LookupCard
          title="Lead Statuses"
          table="lead_statuses"
          collection="leadStatuses"
          items={state.leadStatuses}
          hasColor
        />
        <LookupCard
          title="Company Statuses"
          table="company_statuses"
          collection="companyStatuses"
          items={state.companyStatuses}
          hasColor
        />
        <LookupCard
          title="Product Labels"
          table="product_labels"
          collection="productLabels"
          items={state.productLabels}
          hasColor
        />
        <LookupCard
          title="Compatibility Types"
          table="compatibility_types"
          collection="compatibilityTypes"
          items={state.compatibilityTypes}
        />
      </div>
    </>
  );
}

function LookupCard({ title, table, collection, items, hasColor }: LookupCardProps) {
  const { dispatch } = useData();
  const { showAlert, showConfirm } = useAlert();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#6b7280');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const item = await api.createLookupItem(table, {
        name: newName.trim(),
        ...(hasColor ? { color: newColor } : {}),
        sort_order: items.length,
      });
      dispatch({ type: 'ADD_LOOKUP', collection, payload: item });
      setNewName('');
      setNewColor('#6b7280');
      setShowAdd(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Unknown error';
      if (message.includes('duplicate') || message.includes('unique')) {
        showAlert({ title: 'Duplicate Name', message: `"${newName.trim()}" already exists. Please use a different name.`, variant: 'warning' });
      } else {
        showAlert({ title: 'Error', message: `Failed to add item: ${message}`, variant: 'danger' });
      }
      console.error('Failed to add item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await api.updateLookupItem(table, id, {
        name: editName.trim(),
        ...(hasColor ? { color: editColor } : {}),
      });
      dispatch({ type: 'UPDATE_LOOKUP', collection, payload: updated });
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await showConfirm({
      title: 'Delete Item',
      message: 'Delete this item? It will no longer appear in dropdown lists.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await api.deleteLookupItem(table, id);
      dispatch({ type: 'DELETE_LOOKUP', collection, payload: id });
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const startEdit = (item: LookupItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditColor(item.color || '#6b7280');
  };

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <h3>{title}</h3>
        <button onClick={() => setShowAdd(!showAdd)}>
          <Plus size={12} />
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <div className="settings-list-empty">No items yet. Click "Add" above.</div>
      ) : (
        <ul className="settings-list">
          {items.map((item) => (
            <li key={item.id} className="settings-list-item">
              {editingId === item.id ? (
                <>
                  {hasColor && (
                    <ColorPicker
                      value={editColor}
                      onChange={setEditColor}
                    />
                  )}
                  <input
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEdit(item.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    style={{ flex: 1, padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}
                  />
                  <div className="row-actions" style={{ marginLeft: 8 }}>
                    <button
                      className="row-action-btn"
                      title="Save"
                      onClick={() => handleEdit(item.id)}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      className="row-action-btn"
                      title="Cancel"
                      onClick={() => setEditingId(null)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {hasColor && (
                    <div
                      className="settings-list-item-color"
                      style={{ backgroundColor: item.color || '#6b7280' }}
                    />
                  )}
                  <span className="settings-list-item-name">{item.name}</span>
                  <div className="settings-list-item-actions">
                    <button
                      className="row-action-btn"
                      title="Edit"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="row-action-btn danger"
                      title="Delete"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {showAdd && (
        <div className="settings-add-form">
          {hasColor && (
            <ColorPicker
              value={newColor}
              onChange={setNewColor}
            />
          )}
          <input
            type="text"
            placeholder="Enter name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setShowAdd(false);
            }}
            autoFocus
          />
          <button onClick={handleAdd} disabled={!newName.trim() || saving}>
            <Check size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Email / SMTP Panel
   ═══════════════════════════════════════════ */

interface SmtpSettings {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from_name: string;
  smtp_reply_to: string;
  smtp_secure: boolean;
  smtp_configured: boolean;
}

function SmtpPanel() {
  const { showAlert } = useAlert();
  const [form, setForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_from_name: '',
    smtp_reply_to: '',
    smtp_secure: true,
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  // Fetch SMTP settings on mount
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('smtp_settings')
          .select('*')
          .limit(1)
          .single();

        if (!error && data) {
          const s = data as SmtpSettings;
          setSettingsId(s.id);
          setIsConfigured(s.smtp_configured);
          setForm({
            smtp_host: s.smtp_host || '',
            smtp_port: s.smtp_port || 587,
            smtp_user: s.smtp_user || '',
            smtp_pass: s.smtp_pass || '',
            smtp_from_name: s.smtp_from_name || '',
            smtp_reply_to: s.smtp_reply_to || '',
            smtp_secure: s.smtp_secure ?? true,
          });
        }
      } catch (err) {
        console.error('Failed to fetch SMTP settings:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (field: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const configured = !!(form.smtp_host && form.smtp_user && form.smtp_pass);
      const payload = {
        ...form,
        smtp_port: Number(form.smtp_port) || 587,
        smtp_configured: configured,
        updated_at: new Date().toISOString(),
      };

      if (settingsId) {
        // Update existing row
        const { error } = await supabase
          .from('smtp_settings')
          .update(payload)
          .eq('id', settingsId);
        if (error) throw error;
      } else {
        // No row exists yet — insert one
        const { data, error } = await supabase
          .from('smtp_settings')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) setSettingsId(data.id);
      }

      setIsConfigured(configured);
      setDirty(false);
      showAlert({ title: 'Saved', message: 'SMTP settings saved successfully.', variant: 'success' });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to save SMTP settings';
      showAlert({ title: 'Error', message: msg, variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  // Test email is available when the form has the required fields filled in (even before saving)
  const canTest = isConfigured || !!(form.smtp_host && form.smtp_user && form.smtp_pass);

  if (loading) {
    return (
      <>
        <div className="settings-panel-head">
          <h3>Email / SMTP</h3>
          <p className="settings-panel-desc">Loading email settings…</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <div className="loading-spinner" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="settings-panel-head">
        <h3>Email / SMTP</h3>
        <p className="settings-panel-desc">
          Configure your email settings to send marketing campaigns, order confirmations and invoices.
        </p>
      </div>

      {/* Status card */}
      <div className={`settings-integration-card ${isConfigured ? 'connected' : ''}`}>
        <div className="settings-integration-icon">
          <Mail size={24} />
        </div>
        <div className="settings-integration-info">
          <h4>SMTP Server</h4>
          <p>Connect your email provider to send transactional and marketing emails.</p>
        </div>
        <div className="settings-integration-action">
          {isConfigured
            ? <span className="badge badge-confirmed"><CheckCircle2 size={12} /> Configured</span>
            : <span className="badge badge-warning">Not Configured</span>}
        </div>
      </div>

      {/* Server Configuration */}
      <div className="settings-section">
        <div className="settings-section-title">Server Configuration</div>
        <div className="smtp-field-row">
          <div className="smtp-field">
            <label className="smtp-field-label">SMTP Host</label>
            <input
              className="smtp-field-input"
              value={form.smtp_host}
              onChange={(e) => handleChange('smtp_host', e.target.value)}
              placeholder="smtp.example.com"
            />
          </div>
          <div className="smtp-field">
            <label className="smtp-field-label">Port</label>
            <input
              className="smtp-field-input"
              type="number"
              value={form.smtp_port}
              onChange={(e) => handleChange('smtp_port', e.target.value)}
              placeholder="587"
            />
          </div>
        </div>
        <div className="smtp-field">
          <label className="smtp-checkbox-label">
            <input
              type="checkbox"
              checked={form.smtp_secure}
              onChange={(e) => handleChange('smtp_secure', e.target.checked)}
            />
            Use TLS / SSL
          </label>
        </div>
      </div>

      {/* Authentication */}
      <div className="settings-section">
        <div className="settings-section-title">Authentication</div>
        <div className="smtp-field-row">
          <div className="smtp-field">
            <label className="smtp-field-label">Username</label>
            <input
              className="smtp-field-input"
              value={form.smtp_user}
              onChange={(e) => handleChange('smtp_user', e.target.value)}
              placeholder="noreply@yourdomain.com"
            />
          </div>
          <div className="smtp-field">
            <label className="smtp-field-label">Password</label>
            <input
              className="smtp-field-input"
              type="password"
              value={form.smtp_pass}
              onChange={(e) => handleChange('smtp_pass', e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      {/* Sender Details */}
      <div className="settings-section">
        <div className="settings-section-title">Sender Details</div>
        <div className="smtp-field-row">
          <div className="smtp-field">
            <label className="smtp-field-label">From Name</label>
            <input
              className="smtp-field-input"
              value={form.smtp_from_name}
              onChange={(e) => handleChange('smtp_from_name', e.target.value)}
              placeholder="Isobex Lasers"
            />
          </div>
          <div className="smtp-field">
            <label className="smtp-field-label">Reply-to Email</label>
            <input
              className="smtp-field-input"
              value={form.smtp_reply_to}
              onChange={(e) => handleChange('smtp_reply_to', e.target.value)}
              placeholder="hello@isobexlasers.com"
            />
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="smtp-info-box">
        <Info size={14} />
        <span>
          Once configured, the CRM will use these settings to send emails from the email marketing
          builder, order confirmations and invoices. You can test your settings with the button below.
        </span>
      </div>

      {/* Actions */}
      <div className="settings-form-actions">
        <button
          className="btn-outline"
          onClick={() => setShowTestModal(true)}
          disabled={!canTest}
        >
          <Send size={16} /> Send Test Email
        </button>
        <button
          className="btn-brand"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving
            ? <><Loader2 size={16} className="spin" /> Saving…</>
            : <><Save size={16} /> Save Changes</>}
        </button>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <TestEmailModal
          defaultEmail={form.smtp_reply_to}
          onClose={() => setShowTestModal(false)}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════
   Google Panel — OAuth Connect Flow
   ═══════════════════════════════════════════ */

type OAuthStep = 'idle' | 'authenticating' | 'loading_accounts' | 'pick_location' | 'saving';

interface GoogleAccount {
  name: string;
  accountName: string;
  type: string;
}

interface GoogleLocation {
  name: string;
  title: string;
  address: string;
  placeId: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore - Suppress TS6133 until GooglePlaces integration is live
function GooglePanel() {
  const { showAlert } = useAlert();
  const [data, setData] = useState<{ google_place_id: string; google_business_name: string; google_access_token: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<OAuthStep>('idle');
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [locations, setLocations] = useState<GoogleLocation[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [error, setError] = useState('');

  const REDIRECT_URI = `${window.location.origin}/google-callback.html`;

  useEffect(() => {
    api.fetchGoogleSettings().then(d => {
      if (d && d.google_place_id) {
        setData({ google_place_id: d.google_place_id, google_business_name: d.google_business_name || 'Your Business', google_access_token: d.google_access_token });
      } else if (d && d.google_access_token) {
        // Authenticated but no location selected yet
        setData({ google_place_id: '', google_business_name: '', google_access_token: d.google_access_token });
      }
      setLoading(false);
    });
  }, []);

  // Listen for OAuth callback from popup window
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data?.type !== 'google-oauth-callback' || !event.data?.code) return;

      setStep('authenticating');
      setError('');
      try {
        await api.exchangeGoogleCode(event.data.code, REDIRECT_URI);
        // Token exchanged — now load accounts
        await loadAccounts();
      } catch (err: any) {
        setError(err.message || 'Failed to connect to Google');
        setStep('idle');
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleConnect = async () => {
    try {
      setError('');
      const authUrl = await api.getGoogleAuthUrl(REDIRECT_URI);
      // Open OAuth popup
      const w = 500, h = 600;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      window.open(authUrl, 'google-oauth', `width=${w},height=${h},left=${left},top=${top},popup=yes`);
    } catch (err: any) {
      setError(err.message || 'Failed to start Google connection');
    }
  };

  const loadAccounts = async () => {
    setStep('loading_accounts');
    setError('');
    try {
      const accts = await api.listGoogleAccounts();
      setAccounts(accts);
      if (accts.length === 1) {
        // Auto-select single account and load locations
        setSelectedAccount(accts[0].name);
        await loadLocations(accts[0].name);
      } else if (accts.length === 0) {
        setError('No Google Business accounts found for this Google account.');
        setStep('idle');
      } else {
        setStep('pick_location');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts');
      setStep('idle');
    }
  };

  const loadLocations = async (accountName: string) => {
    setStep('loading_accounts');
    setError('');
    try {
      const locs = await api.listGoogleLocations(accountName);
      setLocations(locs);
      if (locs.length === 0) {
        setError('No business locations found under this account.');
      }
      setStep('pick_location');
    } catch (err: any) {
      setError(err.message || 'Failed to load locations');
      setStep('pick_location');
    }
  };

  const handleSelectLocation = async (loc: GoogleLocation) => {
    if (!loc.placeId) {
      showAlert({ title: 'No Place ID', message: 'This location does not have a Place ID linked yet. It may not be verified on Google Maps.', variant: 'warning' });
      return;
    }
    setStep('saving');
    try {
      await api.selectGoogleLocation(loc.placeId, loc.title, selectedAccount);
      setData({ google_place_id: loc.placeId, google_business_name: loc.title, google_access_token: 'connected' });
      setStep('idle');
      setLocations([]);
      setAccounts([]);
      showAlert({ title: 'Connected!', message: `Successfully connected to ${loc.title}`, variant: 'success' });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message, variant: 'danger' });
      setStep('pick_location');
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.disconnectGoogle();
      setData(null);
      setStep('idle');
      setAccounts([]);
      setLocations([]);
      showAlert({ title: 'Disconnected', message: 'Google integration removed', variant: 'success' });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message, variant: 'danger' });
    }
  };

  // If already authenticated but no location selected, go straight to account loading
  const handlePickLocation = async () => {
    await loadAccounts();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  const isConnected = data && data.google_place_id;
  const hasToken = data && data.google_access_token;

  return (
    <>
      <div className="settings-panel-head">
        <h3>Google Integration</h3>
        <p className="settings-panel-desc">Connect your Google Business Profile to pull in live reviews and send review requests.</p>
      </div>

      <div className={`settings-integration-card ${isConnected ? 'connected' : ''}`}>
        <div className="settings-integration-icon">
          <Star size={24} />
        </div>
        <div className="settings-integration-info">
          <h4>{isConnected ? data.google_business_name : 'Google Business Profile'}</h4>
          <p>{isConnected ? 'Your reviews are now syncing.' : 'Sign in with Google to connect your business profile.'}</p>
        </div>
        <div className="settings-integration-action">
          {isConnected ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="badge badge-confirmed"><CheckCircle2 size={12} /> Connected</span>
              <button className="btn-outline" onClick={handleDisconnect}>Disconnect</button>
            </div>
          ) : hasToken && !isConnected ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn-brand" onClick={handlePickLocation} disabled={step === 'loading_accounts'}>
                {step === 'loading_accounts' ? <><Loader2 size={16} className="spin" /> Loading…</> : 'Pick Location'}
              </button>
              <button className="btn-outline" onClick={handleDisconnect}>Disconnect</button>
            </div>
          ) : (
            <button className="btn-brand" onClick={handleConnect} disabled={step === 'authenticating'}>
              {step === 'authenticating' ? <><Loader2 size={16} className="spin" /> Connecting…</> : 'Connect with Google'}
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="smtp-info-box" style={{ marginTop: 'var(--space-4)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
          <Info size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Location Picker */}
      {step === 'pick_location' && (
        <div className="settings-section" style={{ marginTop: 'var(--space-6)' }}>
          <div className="settings-section-title">Select Your Business Location</div>

          {/* Account selector (if multiple) */}
          {accounts.length > 1 && (
            <div className="smtp-field" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="smtp-field-label">Business Account</label>
              <SearchableSelect
                className="smtp-field-input"
                value={selectedAccount}
                onChange={async (val) => {
                  setSelectedAccount(val);
                  if (val) await loadLocations(val);
                }}
                searchable={false}
                options={[
                  { label: 'Select an account…', value: '' },
                  ...accounts.map(a => ({ label: a.accountName || a.name, value: a.name }))
                ]}
              />
            </div>
          )}

          {/* Location list */}
          {locations.length > 0 && (
            <ul className="settings-list" style={{ maxHeight: 320, overflowY: 'auto' }}>
              {locations.map(loc => (
                <li key={loc.name} className="settings-list-item" style={{ cursor: 'pointer', padding: '12px 14px' }} onClick={() => handleSelectLocation(loc)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{loc.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{loc.address}</div>
                    {!loc.placeId && <div style={{ fontSize: 11, color: 'var(--color-warning)', marginTop: 2 }}>No Place ID — may not be verified</div>}
                  </div>
                  {loc.placeId && <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />}
                </li>
              ))}
            </ul>
          )}

          {locations.length === 0 && !error && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
              <Loader2 size={20} className="spin" />
            </div>
          )}
        </div>
      )}

      <div className="smtp-info-box" style={{ marginTop: 'var(--space-6)' }}>
        <Info size={14} />
        <span>
          Sign in with the Google account that manages your business listing. We'll securely connect to your Business Profile to pull live reviews and enable review requests.
        </span>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   Payments / Stripe Panel
   ═══════════════════════════════════════════ */

interface StripeSettings {
  id: string;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  stripe_configured: boolean;
}

function maskKey(key: string): string {
  if (!key || key.length < 12) return '••••••••';
  return key.slice(0, 7) + '•••' + key.slice(-4);
}

function PaymentsPanel() {
  const { showAlert } = useAlert();
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [maskedPublishable, setMaskedPublishable] = useState('');
  const [maskedSecret, setMaskedSecret] = useState('');
  const [maskedWebhook, setMaskedWebhook] = useState('');
  const [loading, setLoading] = useState(true);

  // Connect form state
  const [showForm, setShowForm] = useState(false);
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('stripe_settings')
          .select('*')
          .limit(1)
          .single();

        if (!error && data) {
          const s = data as StripeSettings;
          setSettingsId(s.id);
          setIsConfigured(s.stripe_configured);
          if (s.stripe_publishable_key) setMaskedPublishable(maskKey(s.stripe_publishable_key));
          if (s.stripe_secret_key) setMaskedSecret(maskKey(s.stripe_secret_key));
          if (s.stripe_webhook_secret) setMaskedWebhook(maskKey(s.stripe_webhook_secret));
        }
      } catch (err) {
        console.error('Failed to fetch Stripe settings:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleConnect = async () => {
    if (!publishableKey.trim() || !secretKey.trim()) {
      showAlert({ title: 'Missing Keys', message: 'Please enter both your Publishable Key and Secret Key.', variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        stripe_publishable_key: publishableKey.trim(),
        stripe_secret_key: secretKey.trim(),
        stripe_webhook_secret: webhookSecret.trim(),
        stripe_configured: true,
        updated_at: new Date().toISOString(),
      };

      if (settingsId) {
        const { error } = await supabase
          .from('stripe_settings')
          .update(payload)
          .eq('id', settingsId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('stripe_settings')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) setSettingsId(data.id);
      }

      setIsConfigured(true);
      setMaskedPublishable(maskKey(publishableKey.trim()));
      setMaskedSecret(maskKey(secretKey.trim()));
      setMaskedWebhook(webhookSecret.trim() ? maskKey(webhookSecret.trim()) : '');
      setShowForm(false);
      setPublishableKey('');
      setSecretKey('');
      setWebhookSecret('');
      showAlert({ title: 'Connected!', message: 'Stripe has been connected successfully.', variant: 'success' });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to save Stripe settings';
      showAlert({ title: 'Error', message: msg, variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!settingsId) return;
    setDisconnecting(true);
    try {
      const { error } = await supabase
        .from('stripe_settings')
        .update({
          stripe_publishable_key: '',
          stripe_secret_key: '',
          stripe_webhook_secret: '',
          stripe_configured: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settingsId);
      if (error) throw error;

      setIsConfigured(false);
      setMaskedPublishable('');
      setMaskedSecret('');
      setMaskedWebhook('');
      setShowForm(false);
      showAlert({ title: 'Disconnected', message: 'Stripe integration has been removed.', variant: 'success' });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to disconnect Stripe';
      showAlert({ title: 'Error', message: msg, variant: 'danger' });
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="settings-panel-head">
          <h3>Payments</h3>
          <p className="settings-panel-desc">Loading payment settings…</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <div className="loading-spinner" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="settings-panel-head">
        <h3>Payments</h3>
        <p className="settings-panel-desc">
          Connect your Stripe account to process payments on your storefront.
        </p>
      </div>

      {/* Integration card */}
      <div className={`settings-integration-card ${isConfigured ? 'connected' : ''}`}>
        <div className="settings-integration-icon" style={{ background: 'none', padding: 0 }}>
          <img src="/stripe-logo.png" alt="Stripe" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
        </div>
        <div className="settings-integration-info">
          <h4>Stripe</h4>
          <p>{isConfigured
            ? 'Your Stripe account is connected and processing payments.'
            : 'Connect your Stripe account to accept credit/debit card payments.'
          }</p>
        </div>
        <div className="settings-integration-action">
          {isConfigured ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="badge badge-confirmed"><CheckCircle2 size={12} /> Connected</span>
              <button className="btn-outline" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? <><Loader2 size={14} className="spin" /> Removing…</> : 'Disconnect'}
              </button>
            </div>
          ) : (
            <button className="btn-brand" onClick={() => setShowForm(true)} disabled={showForm}>
              Connect Stripe
            </button>
          )}
        </div>
      </div>

      {/* Connected: show masked keys */}
      {isConfigured && (maskedPublishable || maskedSecret || maskedWebhook) && (
        <div className="settings-section">
          <div className="settings-section-title">Account Details</div>
          {maskedPublishable && (
            <div className="smtp-field" style={{ marginBottom: 'var(--space-3)' }}>
              <label className="smtp-field-label">Publishable Key</label>
              <div style={{
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'monospace',
                letterSpacing: '0.03em',
              }}>{maskedPublishable}</div>
            </div>
          )}
          {maskedSecret && (
            <div className="smtp-field" style={{ marginBottom: 'var(--space-3)' }}>
              <label className="smtp-field-label">Secret Key</label>
              <div style={{
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'monospace',
                letterSpacing: '0.03em',
              }}>{maskedSecret}</div>
            </div>
          )}
          {maskedWebhook && (
            <div className="smtp-field">
              <label className="smtp-field-label">Webhook Secret</label>
              <div style={{
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'monospace',
                letterSpacing: '0.03em',
              }}>{maskedWebhook}</div>
            </div>
          )}
        </div>
      )}

      {/* Connect form (inline, shown when "Connect Stripe" is clicked) */}
      {!isConfigured && showForm && (
        <div className="settings-section">
          <div className="settings-section-title">Connect Your Stripe Account</div>
          <div className="smtp-field" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="smtp-field-label">Publishable Key *</label>
            <input
              className="smtp-field-input"
              type="text"
              value={publishableKey}
              onChange={(e) => setPublishableKey(e.target.value)}
              placeholder="pk_test_... or pk_live_..."
              autoFocus
            />
          </div>
          <div className="smtp-field">
            <label className="smtp-field-label">Secret Key *</label>
            <input
              className="smtp-field-input"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="sk_test_... or sk_live_..."
            />
          </div>
          <div className="smtp-field" style={{ marginTop: 'var(--space-4)' }}>
            <label className="smtp-field-label">Webhook Signing Secret</label>
            <input
              className="smtp-field-input"
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="whsec_..."
            />
          </div>
          <div className="settings-form-actions">
            <button className="btn-outline" onClick={() => { setShowForm(false); setPublishableKey(''); setSecretKey(''); setWebhookSecret(''); }}>
              Cancel
            </button>
            <button
              className="btn-brand"
              onClick={handleConnect}
              disabled={saving || !secretKey.trim() || !publishableKey.trim()}
            >
              {saving
                ? <><Loader2 size={16} className="spin" /> Connecting…</>
                : <><CheckCircle2 size={16} /> Connect</>}
            </button>
          </div>
        </div>
      )}

      {/* Test Mode Section */}
      <TestModeToggle />
    </>
  );
}

/* ═══════════════════════════════════════════
   Test Mode Toggle (inside Payments panel)
   ═══════════════════════════════════════════ */

function TestModeToggle() {
  const { showAlert } = useAlert();
  const [testMode, setTestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    api.fetchStoreConfig()
      .then((cfg) => setTestMode(cfg.test_mode ?? false))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    const newValue = !testMode;
    setToggling(true);
    try {
      await api.updateStoreConfig({ test_mode: newValue });
      setTestMode(newValue);
      showAlert({
        title: newValue ? 'Test Mode Enabled' : 'Test Mode Disabled',
        message: newValue
          ? 'Orders placed on the storefront will skip payment and inventory. Test orders are marked with [TEST ORDER].'
          : 'The storefront is back to live mode. Payments and inventory tracking are active.',
        variant: newValue ? 'warning' : 'success',
      });
    } catch {
      showAlert({ title: 'Error', message: 'Failed to update test mode.', variant: 'danger' });
    } finally {
      setToggling(false);
    }
  };

  if (loading) return null;

  return (
    <>
      <div style={{ borderTop: '1px solid var(--border)', margin: 'var(--space-8) 0' }} />
      <div className="settings-section">
        <div className="settings-section-title">Test Mode</div>
        <div
          className={`settings-integration-card ${testMode ? 'connected' : ''}`}
          style={testMode ? { borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.06)' } : {}}
        >
          <div className="settings-integration-icon" style={testMode ? { background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' } : {}}>
            {testMode ? <CheckCircle2 size={24} /> : <Info size={24} />}
          </div>
          <div className="settings-integration-info">
            <h4>{testMode ? 'Test Mode is Active' : 'Test Mode'}</h4>
            <p>Place test orders without processing real payments or affecting inventory levels.</p>
          </div>
          <div className="settings-integration-action">
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={testMode ? 'btn-brand' : 'btn-outline'}
              style={{
                padding: '0.375rem 0.875rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: 8,
                ...(testMode ? { background: '#f59e0b', borderColor: '#f59e0b' } : {}),
              }}
            >
              {toggling ? <Loader2 size={14} className="spin" /> : testMode ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      </div>

      <div className="smtp-info-box" style={testMode ? { borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.06)' } : {}}>
        <Info size={14} />
        <span>
          When test mode is enabled: <strong>no real payments</strong> are taken,{' '}
          <strong>inventory levels are unchanged</strong>, and discount/gift card codes are not consumed.
          Test orders are tagged with <code>[TEST ORDER]</code> so you can identify them.
          Confirmation and refund emails will still send normally.
        </span>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   Test Email Modal
   ═══════════════════════════════════════════ */

function TestEmailModal({ defaultEmail, onClose }: { defaultEmail: string; onClose: () => void }) {
  const { showAlert } = useAlert();
  const [toEmail, setToEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!toEmail.trim()) {
      showAlert({ title: 'Missing Email', message: 'Please enter a recipient email address.', variant: 'warning' });
      return;
    }
    setSending(true);
    try {
      const res = await supabase.functions.invoke('send-email', {
        body: { action: 'test', to: toEmail.trim() },
      });
      if (res.error) {
        let detail = 'Failed to send test email';
        try {
          const body = res.data || (res.error as { context?: { json: () => Promise<{ error?: string }> } })?.context?.json?.();
          if (body && typeof body === 'object' && 'error' in body) detail = (body as { error: string }).error;
        } catch { /* ignore */ }
        throw new Error(detail);
      }
      if (res.data?.error) throw new Error(res.data.error);
      showAlert({ title: 'Success', message: `Test email sent to ${toEmail.trim()}!`, variant: 'success' });
      onClose();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to send test email';
      showAlert({ title: 'Error', message: msg, variant: 'danger' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2><Send size={20} /> Send Test Email</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ margin: '0 0 var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Send a test email to verify your SMTP settings are working correctly.
          </p>
          <div className="form-group">
            <label>Send to</label>
            <input
              className="form-input"
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && !sending) handleSend(); }}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={sending}>Cancel</button>
          <button className="btn-brand" onClick={handleSend} disabled={sending || !toEmail.trim()}>
            {sending
              ? <><Loader2 size={16} className="spin" /> Sending…</>
              : <><Send size={16} /> Send Test</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Tracking Panel
   ═══════════════════════════════════════════ */

function TrackingPanel() {
  const { showAlert, showConfirm } = useAlert();
  const projectId = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'your-project-id';

  // ── Excluded IPs state ──────────────────────────────────
  const [excludedIps, setExcludedIps] = useState<ExcludedIp[]>([]);
  const [ipsLoading, setIpsLoading] = useState(true);
  const [showAddIp, setShowAddIp] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addingIp, setAddingIp] = useState(false);
  const [detectingIp, setDetectingIp] = useState(false);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('excluded_ips')
          .select('*')
          .order('created_at', { ascending: true });
        setExcludedIps(data || []);
      } catch (err) {
        console.error('Failed to load excluded IPs:', err);
      } finally {
        setIpsLoading(false);
      }
    })();
  }, []);

  const handleDetectIp = async () => {
    setDetectingIp(true);
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const { ip } = await res.json();
      setNewIp(ip);
      if (!newLabel) setNewLabel('My Current IP');
    } catch {
      showAlert({ title: 'Error', message: 'Failed to detect your IP address.', variant: 'danger' });
    } finally {
      setDetectingIp(false);
    }
  };

  const handleAddIp = async () => {
    const trimmed = newIp.trim();
    if (!trimmed || addingIp) return;
    // Basic IP validation (v4 or v6)
    if (!/^[\d.:a-fA-F]+$/.test(trimmed)) {
      showAlert({ title: 'Invalid IP', message: 'Please enter a valid IPv4 or IPv6 address.', variant: 'warning' });
      return;
    }
    if (excludedIps.some(ip => ip.ip_address === trimmed)) {
      showAlert({ title: 'Duplicate', message: 'This IP address is already excluded.', variant: 'warning' });
      return;
    }
    setAddingIp(true);
    try {
      const { data, error } = await supabase
        .from('excluded_ips')
        .insert({ ip_address: trimmed, label: newLabel.trim() || null })
        .select()
        .single();
      if (error) throw error;
      setExcludedIps(prev => [...prev, data]);
      setNewIp('');
      setNewLabel('');
      setShowAddIp(false);
      showAlert({ title: 'Added', message: `IP ${trimmed} will now be excluded from analytics.`, variant: 'success' });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err?.message || 'Failed to add IP.', variant: 'danger' });
    } finally {
      setAddingIp(false);
    }
  };

  const handleDeleteIp = async (id: string, ip: string) => {
    const ok = await showConfirm({
      title: 'Remove Excluded IP',
      message: `Remove ${ip} from the exclusion list? Traffic from this IP will be tracked again.`,
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from('excluded_ips').delete().eq('id', id);
      if (error) throw error;
      setExcludedIps(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      showAlert({ title: 'Error', message: err?.message || 'Failed to remove IP.', variant: 'danger' });
    }
  };

  const pixelCode = `<script>
  (function() {
    var sid = localStorage.getItem('isbx_session');
    if(!sid) { sid = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2); localStorage.setItem('isbx_session', sid); }
    var track = function() {
      fetch('https://${projectId}.supabase.co/functions/v1/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'page_view',
          session_id: sid,
          url: window.location.href,
          path: window.location.pathname,
          title: document.title,
          referrer: document.referrer,
          user_agent: navigator.userAgent,
          device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        })
      }).catch(function(e) {});
    };
    track();
    var pushState = history.pushState;
    history.pushState = function() { pushState.apply(history, arguments); track(); };
  })();
</script>`;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(pixelCode);
      showAlert({ title: 'Copied', message: 'Tracking pixel copied to clipboard.', variant: 'success' });
    } catch (err) {
      showAlert({ title: 'Error', message: 'Failed to copy to clipboard.', variant: 'danger' });
    }
  };

  return (
    <>
      <div className="settings-panel-head">
        <h3>Tracking Pixel</h3>
        <p className="settings-panel-desc">
          Embed this lightweight tracking script into your website settings. It will securely send all page visits to your CRM Analytics dashboard.
        </p>
      </div>

      <div className="settings-integration-card connected">
        <div className="settings-integration-icon">
          <Activity size={24} />
        </div>
        <div className="settings-integration-info">
          <h4>Website Analytics Pixel</h4>
          <p>Native website tracking without the complexity of Google Analytics.</p>
        </div>
        <div className="settings-integration-action">
          <span className="badge badge-confirmed"><CheckCircle2 size={12} /> Ready</span>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Installation Instructions</div>
        <ol style={{ paddingLeft: '1.25rem', marginBottom: 'var(--space-6)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <li>Go to your website builder or CMS settings.</li>
          <li>Navigate to the <strong>Custom Code</strong> or <strong>Head Scripts</strong> section.</li>
          <li>Paste the code below into the <strong>Start of &lt;head&gt; tag</strong> field.</li>
          <li>Publish your site. Data will instantly start flowing into your CRM Reporting tab.</li>
        </ol>

        <button 
          className="btn-outline" 
          onClick={() => setShowCode(!showCode)}
          style={{ marginBottom: showCode ? 'var(--space-4)' : 0 }}
        >
          {showCode ? 'Hide Tracking Code' : 'View Tracking Code'}
        </button>

        {showCode && (
          <div style={{ position: 'relative' }}>
            <pre style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--border)',
              padding: '1rem',
              borderRadius: 8,
              overflowX: 'auto',
              fontSize: '0.8125rem',
              color: 'var(--color-text-primary)'
            }}>
              <code>{pixelCode}</code>
            </pre>
            <button 
              className="btn-outline" 
              style={{ position: 'absolute', top: 12, right: 12, padding: '6px 12px' }}
              onClick={copyCode}
            >
              <Copy size={14} style={{ marginRight: 6 }} /> Copy Code
            </button>
          </div>
        )}
      </div>
      
      <div className="smtp-info-box" style={{ marginTop: 'var(--space-6)' }}>
        <Info size={14} />
        <span>
          The script tracks page views, unique visitors, devices, and traffic sources automatically.
          Ecommerce tracking (e.g. Add to Cart, Purchases) is handled automatically by the CRM storefront.
        </span>
      </div>

      {/* ── Excluded IP Addresses ────────────────────────── */}
      <div className="settings-section" style={{ marginTop: 'var(--space-8)' }}>
        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={16} /> Excluded IP Addresses
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
          Traffic from these IP addresses will be silently excluded from your analytics and reporting data.
          Use this to filter out your own office, home, or development traffic.
        </p>

        {ipsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
            <div className="loading-spinner" />
          </div>
        ) : (
          <>
            {excludedIps.length === 0 && !showAddIp && (
              <div className="settings-list-empty" style={{ marginBottom: 'var(--space-4)' }}>
                No IP addresses excluded yet. Click "Add IP" to get started.
              </div>
            )}

            {excludedIps.length > 0 && (
              <ul className="settings-list" style={{ marginBottom: 'var(--space-4)' }}>
                {excludedIps.map((item) => (
                  <li key={item.id} className="settings-list-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      <code style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-brand)', fontFamily: 'monospace' }}>
                        {item.ip_address}
                      </code>
                      {item.label && (
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                          — {item.label}
                        </span>
                      )}
                    </div>
                    <div className="settings-list-item-actions">
                      <button
                        className="row-action-btn danger"
                        title="Remove"
                        onClick={() => handleDeleteIp(item.id, item.ip_address)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {showAddIp && (
              <div style={{ 
                background: 'var(--color-surface)', 
                border: '1px solid var(--border)', 
                borderRadius: '8px', 
                padding: '1.25rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem' 
              }}>
                <div className="smtp-field-row" style={{ marginBottom: 0 }}>
                  <div className="smtp-field">
                    <label className="smtp-field-label">IP Address</label>
                    <input
                      className="smtp-field-input"
                      type="text"
                      placeholder="e.g. 203.0.113.45"
                      value={newIp}
                      onChange={(e) => setNewIp(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddIp();
                        if (e.key === 'Escape') setShowAddIp(false);
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="smtp-field">
                    <label className="smtp-field-label">Label (Optional)</label>
                    <input
                      className="smtp-field-input"
                      type="text"
                      placeholder="e.g. Office"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddIp();
                        if (e.key === 'Escape') setShowAddIp(false);
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                  <button
                    className="btn-outline"
                    onClick={handleDetectIp}
                    disabled={detectingIp}
                  >
                    {detectingIp ? <Loader2 size={16} className="spin" /> : <Crosshair size={16} />}
                    <span style={{ marginLeft: 6 }}>Detect My IP</span>
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() => { setShowAddIp(false); setNewIp(''); setNewLabel(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-brand"
                    onClick={handleAddIp}
                    disabled={!newIp.trim() || addingIp}
                  >
                    {addingIp ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                    <span style={{ marginLeft: 6 }}>Add IP</span>
                  </button>
                </div>
              </div>
            )}

            {!showAddIp && (
              <button
                className="btn-outline"
                onClick={() => setShowAddIp(true)}
                style={{ padding: '6px 14px', fontSize: 'var(--font-size-sm)' }}
              >
                <Plus size={14} style={{ marginRight: 6 }} /> Add IP
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
