import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchEmailCampaigns,
  fetchEmailTemplates,
  fetchCampaignRecipients,
  fetchContacts,
  createEmailCampaign,
  updateEmailCampaign,
  deleteEmailCampaign,
  insertCampaignRecipients,
  deleteCampaignRecipients,
} from '@/lib/api';
import type {
  EmailCampaign,
  EmailTemplate,
  CampaignRecipient,
  Contact,
} from '@/types/database';
import {
  Plus, ArrowLeft, Trash2, Copy, Mail, Users, Send,
  Calendar, Clock, Layers, BarChart3, Eye,
  MousePointerClick, AlertTriangle, CheckCircle2, XCircle,
  Search, ChevronRight, Loader2,
} from 'lucide-react';
import './Campaigns.css';

interface CampaignsTabProps {
  activeSubTab?: 'campaigns' | 'analytics';
}

// ────── Status colour helper ───────
function statusColor(status: string) {
  const map: Record<string, string> = {
    pending: 'var(--color-text-tertiary)',
    sent: 'var(--color-info)',
    delivered: 'var(--color-success)',
    opened: '#8b5cf6',
    clicked: 'var(--color-primary)',
    bounced: 'var(--color-warning)',
    failed: 'var(--color-danger)',
  };
  return map[status] || 'var(--color-text-tertiary)';
}

// ─────────── Main Component ───────────
export function CampaignsTab({ activeSubTab = 'campaigns' }: CampaignsTabProps) {
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Views: list | create | detail
  const [view, setView] = useState<'list' | 'create' | 'detail'>(
    activeSubTab === 'analytics' ? 'list' : 'list'
  );
  const [showAnalytics, setShowAnalytics] = useState(activeSubTab === 'analytics');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);

  // Create wizard state
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    subject: '',
    template_id: null as string | null,
    contentSource: 'scratch' as 'scratch' | 'template',
    sendMode: 'now' as 'now' | 'scheduled' | 'batch',
    scheduledDate: '',
    scheduledTime: '',
    batchSize: 50,
    batchInterval: 5,
  });
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [c, t, ct] = await Promise.all([
        fetchEmailCampaigns(),
        fetchEmailTemplates(),
        fetchContacts(),
      ]);
      setCampaigns(c);
      setTemplates(t);
      setContacts(ct);
    } catch (err) {
      console.error('Failed to load campaigns data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filtered contacts for recipient selector
  const filteredContacts = useMemo(() => {
    const q = recipientSearch.toLowerCase();
    return contacts
      .filter(c => c.email)
      .filter(c =>
        !q ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
  }, [contacts, recipientSearch]);

  // ── Campaign List ──
  const handleDelete = async (e: React.MouseEvent, c: EmailCampaign) => {
    e.stopPropagation();
    if (!confirm(`Delete campaign "${c.name}"?`)) return;
    try {
      await deleteEmailCampaign(c.id);
      setCampaigns(prev => prev.filter(x => x.id !== c.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, c: EmailCampaign) => {
    e.stopPropagation();
    try {
      const dup = await createEmailCampaign({
        name: `${c.name} (Copy)`,
        subject: c.subject,
        template_id: c.template_id,
        blocks: c.blocks,
        settings: c.settings,
        html_content: '',
        status: 'draft',
        send_mode: null,
        scheduled_at: null,
        sent_at: null,
        total_recipients: 0,
        batch_size: null,
        batch_interval: null,
        stats: {},
      });
      setCampaigns(prev => [dup, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const openDetail = async (c: EmailCampaign) => {
    setSelectedCampaignId(c.id);
    setView('detail');
    try {
      const r = await fetchCampaignRecipients(c.id);
      setRecipients(r);
    } catch (err) {
      console.error(err);
    }
  };

  const startCreate = () => {
    setForm({
      name: '',
      subject: '',
      template_id: null,
      contentSource: 'scratch',
      sendMode: 'now',
      scheduledDate: '',
      scheduledTime: '',
      batchSize: 50,
      batchInterval: 5,
    });
    setSelectedRecipients([]);
    setStep(0);
    setView('create');
  };

  // ── Wizard: Save & Send ──
  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim()) {
      alert('Campaign name and subject are required.');
      return;
    }
    if (selectedRecipients.length === 0) {
      alert('Select at least one recipient.');
      return;
    }

    setSaving(true);
    try {
      const scheduledAt = form.sendMode === 'scheduled' && form.scheduledDate
        ? new Date(`${form.scheduledDate}T${form.scheduledTime || '09:00'}`).toISOString()
        : null;

      const campaign = await createEmailCampaign({
        name: form.name,
        subject: form.subject,
        template_id: form.template_id,
        blocks: form.template_id
          ? (templates.find(t => t.id === form.template_id)?.blocks || [])
          : [],
        settings: form.template_id
          ? (templates.find(t => t.id === form.template_id)?.settings || {})
          : {},
        html_content: '',
        status: form.sendMode === 'scheduled' ? 'scheduled' : 'draft',
        send_mode: form.sendMode,
        scheduled_at: scheduledAt,
        sent_at: null,
        total_recipients: selectedRecipients.length,
        batch_size: form.sendMode === 'batch' ? form.batchSize : null,
        batch_interval: form.sendMode === 'batch' ? form.batchInterval : null,
        stats: {},
      });

      // Insert recipients
      const recipientRows = selectedRecipients.map(contactId => {
        const contact = contacts.find(c => c.id === contactId);
        return {
          campaign_id: campaign.id,
          contact_id: contactId,
          email: contact?.email || '',
          status: 'pending' as const,
          opened_at: null,
          clicked_at: null,
        };
      });

      await insertCampaignRecipients(recipientRows);

      setCampaigns(prev => [campaign, ...prev]);
      setView('list');
    } catch (err) {
      console.error('Failed to create campaign:', err);
      alert('Failed to create campaign.');
    } finally {
      setSaving(false);
    }
  };

  // ── Analytics helpers ──
  const sentCampaigns = campaigns.filter(c => c.status === 'sent');

  const selectedCampaign = selectedCampaignId
    ? campaigns.find(c => c.id === selectedCampaignId) || null
    : null;

  // ── Analytics Overview ──
  if (showAnalytics && view === 'list') {
    const totalSent = sentCampaigns.reduce((s, c) => s + c.total_recipients, 0);
    return (
      <div className="analytics-overview">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
          <h2 style={{ margin: 0 }}>Email Analytics</h2>
          <button className="btn-secondary" onClick={() => setShowAnalytics(false)}>
            <Mail size={14} /> View Campaigns
          </button>
        </div>
        <div className="analytics-stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="analytics-stat-card">
            <Send size={20} />
            <div className="analytics-stat-value">{sentCampaigns.length}</div>
            <div className="analytics-stat-label">Campaigns Sent</div>
          </div>
          <div className="analytics-stat-card">
            <Users size={20} />
            <div className="analytics-stat-value">{totalSent}</div>
            <div className="analytics-stat-label">Total Recipients</div>
          </div>
          <div className="analytics-stat-card">
            <Eye size={20} />
            <div className="analytics-stat-value">—</div>
            <div className="analytics-stat-label">Avg. Open Rate</div>
          </div>
          <div className="analytics-stat-card">
            <MousePointerClick size={20} />
            <div className="analytics-stat-value">—</div>
            <div className="analytics-stat-label">Avg. Click Rate</div>
          </div>
        </div>

        {sentCampaigns.length === 0 ? (
          <div className="em-empty">
            <BarChart3 size={36} />
            <h3>No campaigns sent yet</h3>
            <p>Send your first campaign to see analytics here.</p>
          </div>
        ) : (
          <div className="campaign-list">
            {sentCampaigns.map(c => (
              <div key={c.id} className="campaign-card" onClick={() => openDetail(c)}>
                <div className="campaign-card-main">
                  <div className="campaign-card-header">
                    <h4>{c.name}</h4>
                    <span className={`campaign-status-badge ${c.status}`}>{c.status}</span>
                  </div>
                  <p className="campaign-card-subject">{c.subject}</p>
                  <div className="campaign-card-meta">
                    <span><Users size={12} /> {c.total_recipients} recipients</span>
                    {c.sent_at && <span><Calendar size={12} /> {new Date(c.sent_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--color-text-tertiary)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Campaign Detail View ──
  if (view === 'detail' && selectedCampaign) {
    const sent = recipients.filter(r => r.status !== 'pending' && r.status !== 'failed').length;
    const opened = recipients.filter(r => r.status === 'opened' || r.status === 'clicked').length;
    const clicked = recipients.filter(r => r.status === 'clicked').length;
    const failed = recipients.filter(r => r.status === 'failed' || r.status === 'bounced').length;
    const total = recipients.length || 1;

    return (
      <div>
        <div className="campaign-detail-header">
          <button className="btn-secondary" onClick={() => { setView('list'); setSelectedCampaignId(null); }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ flex: 1 }}>
            <h2>{selectedCampaign.name}</h2>
            <p className="campaign-detail-subject">{selectedCampaign.subject}</p>
          </div>
          <span className={`campaign-status-badge ${selectedCampaign.status}`}>{selectedCampaign.status}</span>
        </div>

        {selectedCampaign.sent_at && (
          <div className="campaign-sent-date">
            <Calendar size={14} /> Sent {new Date(selectedCampaign.sent_at).toLocaleString()}
          </div>
        )}

        <div className="campaign-stats-grid" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="campaign-stat-card">
            <div className="campaign-stat-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <Send size={18} style={{ color: '#3b82f6' }} />
            </div>
            <div className="campaign-stat-info">
              <div className="campaign-stat-value">{sent}</div>
              <div className="campaign-stat-label">Sent</div>
            </div>
          </div>
          <div className="campaign-stat-card">
            <div className="campaign-stat-icon" style={{ background: 'rgba(139,92,246,0.1)' }}>
              <Eye size={18} style={{ color: '#8b5cf6' }} />
            </div>
            <div className="campaign-stat-info">
              <div className="campaign-stat-value">{opened}</div>
              <div className="campaign-stat-label">Opened</div>
            </div>
            <div className="campaign-stat-pct">{((opened / total) * 100).toFixed(1)}%</div>
          </div>
          <div className="campaign-stat-card">
            <div className="campaign-stat-icon" style={{ background: 'var(--color-primary-subtle)' }}>
              <MousePointerClick size={18} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="campaign-stat-info">
              <div className="campaign-stat-value">{clicked}</div>
              <div className="campaign-stat-label">Clicked</div>
            </div>
            <div className="campaign-stat-pct">{((clicked / total) * 100).toFixed(1)}%</div>
          </div>
          <div className="campaign-stat-card">
            <div className="campaign-stat-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <XCircle size={18} style={{ color: '#ef4444' }} />
            </div>
            <div className="campaign-stat-info">
              <div className="campaign-stat-value">{failed}</div>
              <div className="campaign-stat-label">Failed</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="campaign-progress" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="campaign-progress-bar">
            {clicked > 0 && <div className="campaign-progress-seg clicked" style={{ width: `${(clicked / total) * 100}%` }} />}
            {opened > 0 && <div className="campaign-progress-seg opened" style={{ width: `${((opened - clicked) / total) * 100}%` }} />}
            {sent > 0 && <div className="campaign-progress-seg sent" style={{ width: `${((sent - opened) / total) * 100}%` }} />}
            {failed > 0 && <div className="campaign-progress-seg failed" style={{ width: `${(failed / total) * 100}%` }} />}
          </div>
          <div className="campaign-progress-legend">
            <span><span className="legend-dot" style={{ background: 'var(--color-primary)' }} /> Clicked</span>
            <span><span className="legend-dot" style={{ background: '#8b5cf6' }} /> Opened</span>
            <span><span className="legend-dot" style={{ background: '#3b82f6' }} /> Sent</span>
            <span><span className="legend-dot" style={{ background: '#ef4444' }} /> Failed</span>
          </div>
        </div>

        {/* Recipients table */}
        <div className="em-section-card">
          <div className="em-section-card-head">
            <h3>Recipients ({recipients.length})</h3>
          </div>
          <div className="campaign-recipients-table-wrap">
            <table className="campaign-recipients-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Opened</th>
                  <th>Clicked</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map(r => (
                  <tr key={r.id}>
                    <td>
                      {r.contact
                        ? `${(r.contact as any).first_name} ${(r.contact as any).last_name}`
                        : '—'}
                    </td>
                    <td>{r.email}</td>
                    <td>
                      <span className="campaign-recipient-status" style={{ color: statusColor(r.status) }}>
                        {r.status}
                      </span>
                    </td>
                    <td>{r.opened_at ? new Date(r.opened_at).toLocaleString() : '—'}</td>
                    <td>{r.clicked_at ? new Date(r.clicked_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
                {recipients.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-tertiary)' }}>No recipients</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Campaign Create Wizard ──
  if (view === 'create') {
    const STEPS = ['Details', 'Content', 'Recipients', 'Review & Send'];
    return (
      <div className="campaign-create">
        <div className="campaign-create-header">
          <button className="btn-secondary" onClick={() => setView('list')}>
            <ArrowLeft size={14} /> Back
          </button>
          <h2>New Campaign</h2>
        </div>

        {/* Step indicator */}
        <div className="campaign-steps">
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <div className="campaign-step-line" />}
              <div className={`campaign-step${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}>
                <div className="campaign-step-num">
                  {i < step ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span>{s}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Step 0: Details */}
        {step === 0 && (
          <div className="campaign-step-content">
            <h3>Campaign Details</h3>
            <p className="campaign-step-desc">Give your campaign a name and subject line.</p>
            <div className="form-group">
              <label>Campaign Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Spring Product Launch"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Email Subject *</label>
              <input
                className="form-input"
                placeholder="e.g. Introducing our latest laser heads"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="campaign-step-actions">
              <div />
              <button
                className="btn-secondary"
                style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}
                disabled={!form.name.trim() || !form.subject.trim()}
                onClick={() => setStep(1)}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Content */}
        {step === 1 && (
          <div className="campaign-step-content">
            <h3>Email Content</h3>
            <p className="campaign-step-desc">Design your email in the builder or choose an existing template.</p>

            <div className="campaign-content-options">
              <div
                className={`campaign-content-option${form.contentSource === 'scratch' ? ' selected-source' : ''}`}
                onClick={() => setForm(f => ({ ...f, contentSource: 'scratch', template_id: null }))}
              >
                <div className="campaign-content-option-icon" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                  <Layers size={20} />
                </div>
                <div>
                  <h4>Create from Scratch</h4>
                  <p>Design your email using the drag-and-drop builder</p>
                </div>
                <ChevronRight size={16} />
              </div>

              <div className="campaign-template-divider"><span>or</span></div>

              {templates.length > 0 ? (
                <div className="campaign-template-grid">
                  {templates.filter(t => t.active).map(t => (
                    <div
                      key={t.id}
                      className={`campaign-template-option${form.template_id === t.id ? ' selected' : ''}`}
                      onClick={() => setForm(f => ({ ...f, contentSource: 'template', template_id: t.id }))}
                    >
                      <div className="campaign-template-option-circle" />
                      <div>
                        <h4>{t.name}</h4>
                        <p>{t.subject || '(no subject)'}</p>
                        <span className="campaign-template-blocks">
                          {Array.isArray(t.blocks) ? t.blocks.length : 0} blocks
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-tertiary)' }}>
                  No templates available. Create one first.
                </div>
              )}
            </div>

            <div className="campaign-step-actions">
              <button className="btn-secondary" onClick={() => setStep(0)}>
                <ArrowLeft size={14} /> Back
              </button>
              <button
                className="btn-secondary"
                style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}
                onClick={() => setStep(2)}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Recipients */}
        {step === 2 && (
          <div className="campaign-step-content">
            <h3>Select Recipients</h3>
            <p className="campaign-step-desc">Choose which contacts should receive this campaign. Only contacts with email addresses are shown.</p>

            <div className="recipient-selector">
              <div className="recipient-selector-header">
                <div className="recipient-search-wrap">
                  <Search size={14} />
                  <input
                    className="form-input"
                    placeholder="Search contacts…"
                    value={recipientSearch}
                    onChange={e => setRecipientSearch(e.target.value)}
                  />
                </div>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={() => {
                    if (selectedRecipients.length === filteredContacts.length) {
                      setSelectedRecipients([]);
                    } else {
                      setSelectedRecipients(filteredContacts.map(c => c.id));
                    }
                  }}
                >
                  {selectedRecipients.length === filteredContacts.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {selectedRecipients.length > 0 && (
                <div className="recipient-count-bar">
                  <strong>{selectedRecipients.length}</strong> recipient{selectedRecipients.length !== 1 ? 's' : ''} selected
                  {contacts.filter(c => c.email && selectedRecipients.includes(c.id) && !c.email).length > 0 && (
                    <span style={{ color: 'var(--color-warning)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={12} /> Some without email
                    </span>
                  )}
                </div>
              )}

              <div className="recipient-list">
                {filteredContacts.map(c => (
                  <div
                    key={c.id}
                    className={`recipient-row${selectedRecipients.includes(c.id) ? ' selected' : ''}`}
                    onClick={() => {
                      setSelectedRecipients(prev =>
                        prev.includes(c.id)
                          ? prev.filter(x => x !== c.id)
                          : [...prev, c.id]
                      );
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecipients.includes(c.id)}
                      readOnly
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <div className="recipient-info">
                      <span className="recipient-name">{c.first_name} {c.last_name}</span>
                      <span className="recipient-email">{c.email}</span>
                    </div>
                  </div>
                ))}
                {filteredContacts.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-tertiary)' }}>
                    No contacts with email addresses found.
                  </div>
                )}
              </div>
            </div>

            <div className="campaign-step-actions">
              <button className="btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={14} /> Back
              </button>
              <button
                className="btn-secondary"
                style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}
                disabled={selectedRecipients.length === 0}
                onClick={() => setStep(3)}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Send */}
        {step === 3 && (
          <div className="campaign-step-content">
            <h3>Review & Send</h3>
            <p className="campaign-step-desc">Review your campaign details before sending.</p>

            <div className="campaign-review-summary">
              <div className="campaign-review-item">
                <span className="campaign-review-label">Campaign Name</span>
                <span>{form.name}</span>
              </div>
              <div className="campaign-review-item">
                <span className="campaign-review-label">Subject</span>
                <span>{form.subject}</span>
              </div>
              <div className="campaign-review-item">
                <span className="campaign-review-label">Content</span>
                <span>
                  {form.contentSource === 'template'
                    ? templates.find(t => t.id === form.template_id)?.name || 'Template'
                    : 'From scratch'}
                </span>
              </div>
              <div className="campaign-review-item">
                <span className="campaign-review-label">Recipients</span>
                <span>{selectedRecipients.length} contact{selectedRecipients.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Send mode */}
            <div className="campaign-send-modes">
              <h4>When to send</h4>
              <div className="campaign-send-mode-options">
                {(['now', 'scheduled', 'batch'] as const).map(mode => (
                  <div
                    key={mode}
                    className={`campaign-send-mode-option${form.sendMode === mode ? ' active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, sendMode: mode }))}
                  >
                    <div className="campaign-send-mode-icon" style={{
                      background: form.sendMode === mode ? 'var(--color-primary-subtle)' : 'var(--color-bg-surface)',
                      color: form.sendMode === mode ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                    }}>
                      {mode === 'now' && <Send size={18} />}
                      {mode === 'scheduled' && <Calendar size={18} />}
                      {mode === 'batch' && <Clock size={18} />}
                    </div>
                    <div>
                      <h5>{mode === 'now' ? 'Send Now' : mode === 'scheduled' ? 'Schedule' : 'Batch Send'}</h5>
                      <p>
                        {mode === 'now' && 'Send immediately to all recipients'}
                        {mode === 'scheduled' && 'Pick a date and time'}
                        {mode === 'batch' && 'Send in batches over time'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {form.sendMode === 'scheduled' && (
                <div className="campaign-schedule-fields">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.scheduledDate}
                      onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={form.scheduledTime}
                      onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {form.sendMode === 'batch' && (
                <div className="campaign-schedule-fields">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Batch Size</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.batchSize}
                      onChange={e => setForm(f => ({ ...f, batchSize: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Interval (minutes)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.batchInterval}
                      onChange={e => setForm(f => ({ ...f, batchInterval: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="campaign-step-actions">
              <button className="btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={14} /> Back
              </button>
              <button
                className="btn-secondary"
                style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}
                disabled={saving}
                onClick={handleSave}
              >
                {saving
                  ? <><Loader2 size={14} className="eb-spin" /> Saving…</>
                  : <><Send size={14} /> {form.sendMode === 'scheduled' ? 'Schedule Campaign' : 'Create Campaign'}</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Campaign List (default view) ──
  if (loading) {
    return (
      <div className="em-empty">
        <div className="loading-spinner" />
        <p>Loading campaigns…</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
        <h2 style={{ margin: 0 }}>Campaigns</h2>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn-secondary" onClick={() => setShowAnalytics(true)}>
            <BarChart3 size={14} /> Analytics
          </button>
          <button
            className="btn-secondary"
            style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}
            onClick={startCreate}
          >
            <Plus size={14} /> New Campaign
          </button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="em-empty">
          <Mail size={36} />
          <h3>No campaigns yet</h3>
          <p>Create your first email campaign to start reaching your contacts.</p>
          <button
            className="btn-secondary"
            style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}
            onClick={startCreate}
          >
            <Plus size={14} /> New Campaign
          </button>
        </div>
      ) : (
        <div className="campaign-list">
          {campaigns.map(c => (
            <div key={c.id} className="campaign-card" onClick={() => openDetail(c)}>
              <div className="campaign-card-main">
                <div className="campaign-card-header">
                  <h4>{c.name}</h4>
                  <span className={`campaign-status-badge ${c.status}`}>{c.status}</span>
                </div>
                <p className="campaign-card-subject">{c.subject}</p>
                <div className="campaign-card-meta">
                  <span><Users size={12} /> {c.total_recipients} recipients</span>
                  <span><Calendar size={12} /> {new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="campaign-card-actions" onClick={e => e.stopPropagation()}>
                <button className="row-action-btn" title="Duplicate" onClick={e => handleDuplicate(e, c)}>
                  <Copy size={14} />
                </button>
                <button className="row-action-btn danger" title="Delete" onClick={e => handleDelete(e, c)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
