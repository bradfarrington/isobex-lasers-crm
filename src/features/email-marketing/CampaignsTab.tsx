import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAlert } from '@/components/ui/AlertDialog';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  fetchEmailCampaigns,
  fetchEmailTemplates,
  fetchCampaignRecipients,
  fetchAllCampaignRecipients,
  fetchContacts,
  createEmailCampaign,
  updateEmailCampaign,
  deleteEmailCampaign,
  insertCampaignRecipients,
  deleteCampaignRecipients,
  sendCampaign,
  fetchEmailCampaign,
} from '@/lib/api';
import type {
  EmailCampaign,
  EmailTemplate,
  CampaignRecipient,
  Contact,
} from '@/types/database';
import {
  Plus, ArrowLeft, Trash2, Copy, Mail, Users, Send,
  Calendar, Clock, Layers, BarChart3, Eye, Pencil,
  MousePointerClick, AlertTriangle, CheckCircle2, XCircle,
  Search, ChevronRight, Loader2,
} from 'lucide-react';
import { DateTimePicker } from '@/components/ui/DatePicker';
import { generateEmailHtml } from './builder/mjml';
import type { BlockData } from './builder/constants';
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
  const { showAlert, showConfirm } = useAlert();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
    scheduledDateTime: '',
    batchSize: 50,
    batchInterval: 5,
  });
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  // Track campaign ID when resuming from builder
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  // Load data
  const [allRecipients, setAllRecipients] = useState<CampaignRecipient[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [c, t, ct, ar] = await Promise.all([
        fetchEmailCampaigns(),
        fetchEmailTemplates(),
        fetchContacts(),
        fetchAllCampaignRecipients(),
      ]);
      setCampaigns(c);
      setTemplates(t);
      setContacts(ct);
      setAllRecipients(ar);
    } catch (err) {
      console.error('Failed to load campaigns data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle return from email builder (query params: campaignId, step)
  useEffect(() => {
    const returnCampaignId = searchParams.get('campaignId');
    const returnStep = searchParams.get('step');
    if (returnCampaignId && returnStep) {
      // Clear the query params
      setSearchParams({}, { replace: true });
      // Resume the create wizard at the recipients step
      setEditingCampaignId(returnCampaignId);
      // Pre-fill form from the campaign data
      const campaign = campaigns.find(c => c.id === returnCampaignId);
      if (campaign) {
        setForm(f => ({
          ...f,
          name: campaign.name || f.name,
          subject: campaign.subject || f.subject,
          template_id: campaign.template_id || null,
          contentSource: campaign.template_id ? 'template' : 'scratch',
        }));
      } else {
        // Campaign might not be loaded yet — fetch it
        fetchEmailCampaign(returnCampaignId).then(c => {
          setCampaigns(prev => {
            const exists = prev.some(x => x.id === c.id);
            return exists ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev];
          });
          setForm(f => ({
            ...f,
            name: c.name || f.name,
            subject: c.subject || f.subject,
            template_id: c.template_id || null,
            contentSource: c.template_id ? 'template' : 'scratch',
          }));
        }).catch(() => {});
      }
      setStep(parseInt(returnStep, 10) || 2);
      setView('create');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered contacts for recipient selector
  const filteredContacts = useMemo(() => {
    const q = recipientSearch.toLowerCase();
    return contacts
      .filter(c => c.email && !c.unsubscribed)
      .filter(c =>
        !q ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
  }, [contacts, recipientSearch]);

  // ── Campaign List ──
  const handleDelete = async (e: React.MouseEvent, c: EmailCampaign) => {
    e.stopPropagation();
    const ok = await showConfirm({ title: 'Delete Campaign', message: `Delete campaign "${c.name}"?`, variant: 'danger', confirmLabel: 'Delete' });
    if (!ok) return;
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
      scheduledDateTime: '',
      batchSize: 50,
      batchInterval: 5,
    });
    setSelectedRecipients([]);
    setEditingCampaignId(null);
    setStep(0);
    setView('create');
  };

  // ── Wizard: Save & Send ──
  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim()) {
      showAlert({ title: 'Missing Fields', message: 'Campaign name and subject are required.', variant: 'warning' });
      return;
    }
    if (selectedRecipients.length === 0) {
      showAlert({ title: 'No Recipients', message: 'Select at least one recipient.', variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const scheduledAt = form.sendMode === 'scheduled' && form.scheduledDateTime
        ? new Date(form.scheduledDateTime.replace('T', 'T') + ':00').toISOString()
        : null;

      const templateData = form.template_id
        ? templates.find(t => t.id === form.template_id)
        : null;

      if (editingCampaignId) {
        // Returning from builder — update existing campaign
        await updateEmailCampaign(editingCampaignId, {
          send_mode: form.sendMode,
          scheduled_at: scheduledAt,
          status: form.sendMode === 'scheduled' ? 'scheduled' : 'draft',
          total_recipients: selectedRecipients.length,
          batch_size: form.sendMode === 'batch' ? form.batchSize : null,
          batch_interval: form.sendMode === 'batch' ? form.batchInterval : null,
        });

        // Insert recipients
        await deleteCampaignRecipients(editingCampaignId);
        const recipientRows = selectedRecipients.map(contactId => {
          const contact = contacts.find(c => c.id === contactId);
          return {
            campaign_id: editingCampaignId,
            contact_id: contactId,
            email: contact?.email || '',
            status: 'pending' as const,
            opened_at: null,
            clicked_at: null,
          };
        });
        await insertCampaignRecipients(recipientRows);

        let updated = await fetchEmailCampaign(editingCampaignId);
        setCampaigns(prev => prev.map(c => c.id === editingCampaignId ? updated : c));

        // Auto-send if mode is 'now' and campaign has HTML content
        if (form.sendMode === 'now' && updated.html_content) {
          try {
            const result = await sendCampaign(editingCampaignId);
            showAlert({
              title: 'Campaign Sent',
              message: `Successfully sent to ${result.sent} of ${result.total} recipients.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`,
              variant: result.failed > 0 ? 'warning' : 'success',
            });
            updated = await fetchEmailCampaign(editingCampaignId);
            setCampaigns(prev => prev.map(c => c.id === editingCampaignId ? updated : c));
          } catch (sendErr: any) {
            showAlert({
              title: 'Send Failed',
              message: sendErr.message || 'Campaign was saved but failed to send. You can retry from the campaign detail.',
              variant: 'danger',
            });
          }
        }
      } else {
        const campaignBlocks = (templateData?.blocks || []) as BlockData[];
        const campaignSettings = templateData?.settings || {};
        // Generate HTML from template blocks so campaign is ready to send
        const htmlContent = campaignBlocks.length > 0
          ? generateEmailHtml(campaignBlocks, campaignSettings, true)
          : '';

        const campaign = await createEmailCampaign({
          name: form.name,
          subject: form.subject,
          template_id: form.template_id,
          blocks: campaignBlocks,
          settings: campaignSettings,
          html_content: htmlContent,
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

        // Auto-send if mode is 'now'
        if (form.sendMode === 'now' && htmlContent) {
          try {
            const result = await sendCampaign(campaign.id);
            showAlert({
              title: 'Campaign Sent',
              message: `Successfully sent to ${result.sent} of ${result.total} recipients.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`,
              variant: result.failed > 0 ? 'warning' : 'success',
            });
            // Refresh campaign data after send
            const updated = await fetchEmailCampaign(campaign.id);
            setCampaigns(prev => prev.map(c => c.id === campaign.id ? updated : c));
          } catch (sendErr: any) {
            showAlert({
              title: 'Send Failed',
              message: sendErr.message || 'Campaign was created but failed to send. You can retry from the campaign detail.',
              variant: 'danger',
            });
          }
        }
      }

      setView('list');
      setEditingCampaignId(null);
    } catch (err) {
      console.error('Failed to create campaign:', err);
      showAlert({ title: 'Error', message: 'Failed to create campaign.', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  // ── Scratch: Create draft campaign and open builder ──
  const handleScratchDesign = async () => {
    if (!form.name.trim() || !form.subject.trim()) {
      showAlert({ title: 'Missing Fields', message: 'Campaign name and subject are required.', variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const campaign = await createEmailCampaign({
        name: form.name,
        subject: form.subject,
        template_id: null,
        blocks: [],
        settings: {},
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
      setCampaigns(prev => [campaign, ...prev]);
      // Navigate to email builder in campaign mode
      navigate(`/email-marketing/builder?campaignId=${campaign.id}`);
    } catch (err) {
      console.error('Failed to create draft campaign:', err);
      showAlert({ title: 'Error', message: 'Failed to create campaign.', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  // ── Send Campaign ──
  const handleSendCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    // Must have html_content
    if (!campaign.html_content) {
      showAlert({ title: 'No Email Content', message: 'This campaign has no email content. Open it in the email builder and save it first.', variant: 'warning' });
      return;
    }

    const ok = await showConfirm({
      title: 'Send Campaign',
      message: `Send "${campaign.name}" to all pending recipients now?`,
      variant: 'warning',
      confirmLabel: 'Send Now',
    });
    if (!ok) return;

    setSending(true);
    try {
      const result = await sendCampaign(campaignId);
      showAlert({
        title: 'Campaign Sent',
        message: `Successfully sent to ${result.sent} of ${result.total} recipients.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`,
        variant: result.failed > 0 ? 'warning' : 'success',
      });
      // Refresh campaign data
      const updated = await fetchEmailCampaign(campaignId);
      setCampaigns(prev => prev.map(c => c.id === campaignId ? updated : c));
      // Refresh recipients if in detail view
      if (view === 'detail' && selectedCampaignId === campaignId) {
        const r = await fetchCampaignRecipients(campaignId);
        setRecipients(r);
      }
    } catch (err: any) {
      showAlert({ title: 'Send Failed', message: err.message || 'Failed to send campaign.', variant: 'danger' });
    } finally {
      setSending(false);
    }
  };

  // ── Analytics helpers ──
  const sentCampaigns = campaigns.filter(c => c.status === 'sent');

  // Build per-campaign recipient stats from allRecipients
  const campaignRecipientStats = useMemo(() => {
    const map: Record<string, { total: number; opened: number; clicked: number; failed: number }> = {};
    for (const r of allRecipients) {
      if (!map[r.campaign_id]) map[r.campaign_id] = { total: 0, opened: 0, clicked: 0, failed: 0 };
      const s = map[r.campaign_id];
      s.total++;
      if (r.status === 'opened' || r.status === 'clicked') s.opened++;
      if (r.status === 'clicked') s.clicked++;
      if (r.status === 'failed' || r.status === 'bounced') s.failed++;
    }
    return map;
  }, [allRecipients]);

  // Compute avg open / click rate across sent campaigns
  const { avgOpenRate, avgClickRate } = useMemo(() => {
    if (sentCampaigns.length === 0) return { avgOpenRate: null, avgClickRate: null };
    let openSum = 0;
    let clickSum = 0;
    let count = 0;
    for (const c of sentCampaigns) {
      const s = campaignRecipientStats[c.id];
      if (!s || s.total === 0) continue;
      openSum += (s.opened / s.total) * 100;
      clickSum += (s.clicked / s.total) * 100;
      count++;
    }
    if (count === 0) return { avgOpenRate: null, avgClickRate: null };
    return { avgOpenRate: openSum / count, avgClickRate: clickSum / count };
  }, [sentCampaigns, campaignRecipientStats]);

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
            <div className="analytics-stat-value">{avgOpenRate !== null ? `${avgOpenRate.toFixed(1)}%` : '—'}</div>
            <div className="analytics-stat-label">Avg. Open Rate</div>
          </div>
          <div className="analytics-stat-card">
            <MousePointerClick size={20} />
            <div className="analytics-stat-value">{avgClickRate !== null ? `${avgClickRate.toFixed(1)}%` : '—'}</div>
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
            {sentCampaigns.map(c => {
              const cs = campaignRecipientStats[c.id] || { total: 0, opened: 0, clicked: 0, failed: 0 };
              return (
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
                      <span style={{ color: '#8b5cf6' }}><Eye size={12} /> {cs.opened} opened</span>
                      <span style={{ color: '#10b981' }}><MousePointerClick size={12} /> {cs.clicked} clicked</span>
                      {cs.failed > 0 && <span style={{ color: 'var(--color-danger)' }}><XCircle size={12} /> {cs.failed} failed</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                </div>
              );
            })}
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
          {(selectedCampaign.status === 'draft' || selectedCampaign.status === 'scheduled') && (
            <>
              <button
                className="btn-secondary"
                onClick={() => navigate(`/email-marketing/builder?campaignId=${selectedCampaign.id}`)}
              >
                <Pencil size={14} /> Edit Email
              </button>
              <button
                className="btn-secondary"
                style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}
                disabled={sending}
                onClick={() => handleSendCampaign(selectedCampaign.id)}
              >
                {sending ? <><Loader2 size={14} className="eb-spin" /> Sending…</> : <><Send size={14} /> Send Now</>}
              </button>
            </>
          )}
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
            <div className="campaign-stat-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <MousePointerClick size={18} style={{ color: '#10b981' }} />
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
            <span><span className="legend-dot" style={{ background: '#10b981' }} /> Clicked</span>
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
                  <p>Design a one-off email using the drag-and-drop builder (not saved as a template)</p>
                </div>
                <ChevronRight size={16} />
              </div>

              <div className="campaign-template-divider"><span>or use a template</span></div>

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
                  No templates available yet.
                </div>
              )}
            </div>

            <div className="campaign-step-actions">
              <button className="btn-secondary" onClick={() => setStep(0)}>
                <ArrowLeft size={14} /> Back
              </button>
              {form.contentSource === 'scratch' ? (
                <button
                  className="btn-secondary"
                  style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}
                  disabled={saving}
                  onClick={handleScratchDesign}
                >
                  {saving ? <><Loader2 size={14} className="eb-spin" /> Creating…</> : <><Layers size={14} /> Open Builder</>}
                </button>
              ) : (
                <button
                  className="btn-secondary"
                  style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}
                  disabled={!form.template_id}
                  onClick={() => setStep(2)}
                >
                  Next <ChevronRight size={14} />
                </button>
              )}
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
                <div className="campaign-schedule-fields" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Date & Time</label>
                    <DateTimePicker
                      value={form.scheduledDateTime}
                      onChange={val => setForm(f => ({ ...f, scheduledDateTime: val }))}
                      placeholder="Pick a date and time…"
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
                  : <><Send size={14} /> {form.sendMode === 'now' ? 'Create & Send' : form.sendMode === 'scheduled' ? 'Schedule Campaign' : 'Create & Start Batch'}</>
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
                {(c.status === 'draft' || c.status === 'scheduled') && (
                  <button
                    className="row-action-btn"
                    title="Send Now"
                    disabled={sending}
                    onClick={e => { e.stopPropagation(); handleSendCampaign(c.id); }}
                  >
                    <Send size={14} />
                  </button>
                )}
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
