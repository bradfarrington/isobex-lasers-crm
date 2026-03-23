import { useState, useEffect } from 'react';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { PageShell } from '@/components/layout/PageShell';
import { useData } from '@/context/DataContext';
import { supabase } from '@/lib/supabase';
import * as api from '@/lib/api';
import type { LookupItem } from '@/types/database';
import { useAlert } from '@/components/ui/AlertDialog';
import {
  Plus, Pencil, Trash2, X, Check, Mail, Save, Send, Loader2,
  CheckCircle2, Info, ListFilter, Building2,
} from 'lucide-react';
import type { BusinessProfile } from '@/types/database';
import './SettingsPage.css';

/* ═══════════════════════════════════════════
   Settings Page — Tabbed Layout
   ═══════════════════════════════════════════ */

const TABS = [
  { id: 'business', label: 'Business Profile', icon: Building2 },
  { id: 'lookups', label: 'Lookups', icon: ListFilter },
  { id: 'email', label: 'Email / SMTP', icon: Mail },
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
