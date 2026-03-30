import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAlert } from '@/components/ui/AlertDialog';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import { TagInput } from '@/components/ui/TagInput';
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
  sendCampaign,
  fetchEmailCampaign,
  addTagToContacts,
  createTag,
} from '@/lib/api';
import type {
  EmailCampaign,
  EmailTemplate,
  CampaignRecipient,
  Contact,
  Tag,
} from '@/types/database';
import {
  Plus, ArrowLeft, Trash2, Copy, Mail, Users, Send,
  Calendar, Clock, Layers, BarChart3, Eye, Pencil,
  MousePointerClick, AlertTriangle, CheckCircle2, XCircle,
  Search, ChevronRight, Loader2, TrendingUp, ShoppingCart,
  RefreshCw, EyeOff, Tags, X,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { fetchEmailAnalytics, type EmailAnalyticsSummary } from '@/services/emailAnalytics';
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
  const { state: globalState, dispatch } = useData();

  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Views: list | create | detail
  const [view, setView] = useState<'list' | 'create' | 'detail'>(
    activeSubTab === 'analytics' ? 'list' : 'list'
  );
  const showAnalytics = activeSubTab === 'analytics';
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);

  // Recipient table sorting
  type RecipientSortKey = 'name' | 'email' | 'status' | 'opened_at' | 'clicked_at';
  const [recipientSortKey, setRecipientSortKey] = useState<RecipientSortKey>('name');
  const [recipientSortDir, setRecipientSortDir] = useState<'asc' | 'desc'>('asc');

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
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  // Track campaign ID when resuming from builder
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  // Stat drill-down modal
  type DrillDownFilter = 'sent' | 'opened' | 'clicked' | 'failed' | 'unopened';
  const [drillFilter, setDrillFilter] = useState<DrillDownFilter | null>(null);

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

  // Close tag dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  // Eligible contacts (have email and not unsubscribed)
  const eligibleContacts = useMemo(() =>
    contacts.filter(c => c.email && !c.unsubscribed),
    [contacts]
  );

  // Tag counts: how many eligible contacts per tag
  const tagContactCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of eligibleContacts) {
      for (const t of (c.tags || [])) {
        counts.set(t.id, (counts.get(t.id) || 0) + 1);
      }
    }
    return counts;
  }, [eligibleContacts]);

  // Contact IDs for each selected tag
  const contactIdsBySelectedTags = useMemo(() => {
    if (selectedTagIds.length === 0) return new Set<string>();
    const ids = new Set<string>();
    for (const c of eligibleContacts) {
      const cTagIds = (c.tags || []).map(t => t.id);
      if (selectedTagIds.some(tid => cTagIds.includes(tid))) {
        ids.add(c.id);
      }
    }
    return ids;
  }, [eligibleContacts, selectedTagIds]);

  // Handle tag toggle
  const handleTagToggle = useCallback((tagId: string) => {
    setSelectedTagIds(prev => {
      const isRemoving = prev.includes(tagId);
      const next = isRemoving ? prev.filter(id => id !== tagId) : [...prev, tagId];

      // Compute the contact IDs for the toggled tag
      const tagContactIds = eligibleContacts
        .filter(c => (c.tags || []).some(t => t.id === tagId))
        .map(c => c.id);

      if (isRemoving) {
        // Compute contact IDs still covered by remaining tags
        const remainingTagSet = new Set(next);
        const stillCovered = new Set<string>();
        for (const c of eligibleContacts) {
          const cTagIds = (c.tags || []).map(t => t.id);
          if (cTagIds.some(tid => remainingTagSet.has(tid))) {
            stillCovered.add(c.id);
          }
        }
        // Remove contacts that were added by this tag and are NOT covered by remaining tags
        setSelectedRecipients(sr =>
          sr.filter(id => !tagContactIds.includes(id) || stillCovered.has(id))
        );
      } else {
        // Add contacts from this tag
        setSelectedRecipients(sr => {
          const existing = new Set(sr);
          const toAdd = tagContactIds.filter(id => !existing.has(id));
          return toAdd.length > 0 ? [...sr, ...toAdd] : sr;
        });
      }

      return next;
    });
  }, [eligibleContacts]);

  // Filtered contacts for recipient selector
  const filteredContacts = useMemo(() => {
    const q = recipientSearch.toLowerCase();
    return eligibleContacts
      .filter(c => {
        // If tags are selected, only show contacts with at least one selected tag
        if (selectedTagIds.length > 0 && !contactIdsBySelectedTags.has(c.id)) return false;
        return true;
      })
      .filter(c =>
        !q ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
  }, [eligibleContacts, recipientSearch, selectedTagIds, contactIdsBySelectedTags]);

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
    setSelectedTagIds([]);
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
    if (form.sendMode === 'scheduled') {
      if (!form.scheduledDateTime) {
        showAlert({ title: 'No Date/Time', message: 'Please pick a date and time for the scheduled send.', variant: 'warning' });
        return;
      }
      const scheduledMs = new Date(form.scheduledDateTime + ':00').getTime();
      const minMs = Date.now() + 5 * 60_000;
      if (scheduledMs < minMs) {
        showAlert({ title: 'Too Soon', message: 'Scheduled time must be at least 5 minutes from now.', variant: 'warning' });
        return;
      }
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
  // ── Analytics helpers ──
  // Removed unused sentCampaigns and campaignRecipientStats helpers


  const selectedCampaign = selectedCampaignId
    ? campaigns.find(c => c.id === selectedCampaignId) || null
    : null;

  // ── Analytics Overview ──
  if (showAnalytics && view === 'list') {
    return <EmailAnalyticsDashboard />;
  }

  // ── Campaign Detail View ──
  if (view === 'detail' && selectedCampaign) {
    const sent = recipients.filter(r => r.status !== 'pending' && r.status !== 'failed').length;
    const opened = recipients.filter(r => r.status === 'opened' || r.status === 'clicked').length;
    const clicked = recipients.filter(r => r.status === 'clicked').length;
    const failed = recipients.filter(r => r.status === 'failed' || r.status === 'bounced').length;
    const unopened = sent - opened;
    const total = recipients.length || 1;

    // Drill-down: filter recipients by stat category
    const drillRecipients = drillFilter ? recipients.filter(r => {
      switch (drillFilter) {
        case 'sent': return r.status !== 'pending' && r.status !== 'failed';
        case 'opened': return r.status === 'opened' || r.status === 'clicked';
        case 'clicked': return r.status === 'clicked';
        case 'failed': return r.status === 'failed' || r.status === 'bounced';
        case 'unopened': return (r.status === 'sent' || r.status === 'delivered') && !r.opened_at;
        default: return false;
      }
    }) : [];

    const drillContactIds = drillRecipients
      .map(r => r.contact_id)
      .filter((id): id is string => !!id);

    const drillLabels: Record<DrillDownFilter, string> = {
      sent: 'Sent', opened: 'Opened', clicked: 'Clicked', failed: 'Failed', unopened: 'Unopened',
    };

    const handleDrillAddTag = async (tagId: string) => {
      if (drillContactIds.length === 0) return;
      try {
        await addTagToContacts(tagId, drillContactIds);
        showAlert({ title: 'Tags Added', message: `Tag added to ${drillContactIds.length} contact${drillContactIds.length !== 1 ? 's' : ''}.`, variant: 'success' });
      } catch (err) {
        console.error('Failed to add tag:', err);
        showAlert({ title: 'Error', message: 'Failed to add tag.', variant: 'danger' });
      }
    };

    const handleDrillCreateTag = async (name: string): Promise<Tag> => {
      const tag = await createTag(name);
      dispatch({ type: 'ADD_TAG', payload: tag });
      return tag;
    };

    return (
      <div>
        <div className="campaign-detail-header">
          <div className="campaign-detail-header-top">
            <button className="btn-secondary" onClick={() => { setView('list'); setSelectedCampaignId(null); }}>
              <ArrowLeft size={14} /> <span className="hide-on-mobile">Back</span>
            </button>
            <span className={`campaign-status-badge ${selectedCampaign.status}`}>{selectedCampaign.status}</span>
          </div>
          
          <div className="campaign-detail-title-wrap">
            <h2>{selectedCampaign.name}</h2>
            <p className="campaign-detail-subject">{selectedCampaign.subject}</p>
          </div>
          
          {(selectedCampaign.status === 'draft' || selectedCampaign.status === 'scheduled') && (
            <div className="campaign-detail-actions">
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
            </div>
          )}
        </div>

        {selectedCampaign.sent_at && (
          <div className="campaign-sent-date">
            <Calendar size={14} /> Sent {new Date(selectedCampaign.sent_at).toLocaleString()}
          </div>
        )}

        <div className="campaign-stats-grid" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="campaign-stat-card clickable" onClick={() => setDrillFilter('sent')}>
            <div className="campaign-stat-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <Send size={18} style={{ color: '#3b82f6' }} />
            </div>
            <div className="campaign-stat-info">
              <div className="campaign-stat-value">{sent}</div>
              <div className="campaign-stat-label">Sent</div>
            </div>
          </div>
          <div className="campaign-stat-card clickable" onClick={() => setDrillFilter('opened')}>
            <div className="campaign-stat-icon" style={{ background: 'rgba(139,92,246,0.1)' }}>
              <Eye size={18} style={{ color: '#8b5cf6' }} />
            </div>
            <div className="campaign-stat-info">
              <div className="campaign-stat-value">{opened}</div>
              <div className="campaign-stat-label">Opened</div>
            </div>
            <div className="campaign-stat-pct">{((opened / total) * 100).toFixed(1)}%</div>
          </div>
          <div className="campaign-stat-card clickable" onClick={() => setDrillFilter('unopened')}>
            <div className="campaign-stat-icon" style={{ background: 'rgba(156,163,175,0.1)' }}>
              <EyeOff size={18} style={{ color: '#9ca3af' }} />
            </div>
            <div className="campaign-stat-info">
              <div className="campaign-stat-value">{unopened}</div>
              <div className="campaign-stat-label">Unopened</div>
            </div>
            <div className="campaign-stat-pct">{((unopened / total) * 100).toFixed(1)}%</div>
          </div>
          <div className="campaign-stat-card clickable" onClick={() => setDrillFilter('clicked')}>
            <div className="campaign-stat-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <MousePointerClick size={18} style={{ color: '#10b981' }} />
            </div>
            <div className="campaign-stat-info">
              <div className="campaign-stat-value">{clicked}</div>
              <div className="campaign-stat-label">Clicked</div>
            </div>
            <div className="campaign-stat-pct">{((clicked / total) * 100).toFixed(1)}%</div>
          </div>
          <div className="campaign-stat-card clickable" onClick={() => setDrillFilter('failed')}>
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
                  {[
                    { key: 'name' as RecipientSortKey, label: 'Name' },
                    { key: 'email' as RecipientSortKey, label: 'Email' },
                    { key: 'status' as RecipientSortKey, label: 'Status' },
                    { key: 'opened_at' as RecipientSortKey, label: 'Opened' },
                    { key: 'clicked_at' as RecipientSortKey, label: 'Clicked' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => {
                        if (recipientSortKey === col.key) {
                          setRecipientSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setRecipientSortKey(col.key);
                          setRecipientSortDir('asc');
                        }
                      }}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      {col.label}{' '}
                      {recipientSortKey === col.key ? (recipientSortDir === 'asc' ? '▲' : '▼') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="responsive-table-body">
                {[...recipients]
                  .sort((a, b) => {
                    const dir = recipientSortDir === 'asc' ? 1 : -1;
                    const getName = (r: any) => r.contact ? `${r.contact.first_name || ''} ${r.contact.last_name || ''}`.trim().toLowerCase() : '';
                    switch (recipientSortKey) {
                      case 'name': return getName(a).localeCompare(getName(b)) * dir;
                      case 'email': return (a.email || '').localeCompare(b.email || '') * dir;
                      case 'status': return (a.status || '').localeCompare(b.status || '') * dir;
                      case 'opened_at': return ((a.opened_at || '') > (b.opened_at || '') ? 1 : -1) * dir;
                      case 'clicked_at': return ((a.clicked_at || '') > (b.clicked_at || '') ? 1 : -1) * dir;
                      default: return 0;
                    }
                  })
                  .map(r => (
                  <tr key={r.id} className="responsive-table-row">
                    <td data-label="Name" className="responsive-table-cell primary-cell">
                      {r.contact
                        ? `${(r.contact as any).first_name} ${(r.contact as any).last_name}`
                        : '—'}
                    </td>
                    <td data-label="Email" className="responsive-table-cell">{r.email}</td>
                    <td data-label="Status" className="responsive-table-cell">
                      <span className="campaign-recipient-status" style={{ color: statusColor(r.status) }}>
                        {r.status}
                      </span>
                    </td>
                    <td data-label="Opened" className="responsive-table-cell">{r.opened_at ? new Date(r.opened_at).toLocaleString() : '—'}</td>
                    <td data-label="Clicked" className="responsive-table-cell">{r.clicked_at ? new Date(r.clicked_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
                {recipients.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-tertiary)' }}>No recipients</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stat drill-down modal */}
        {drillFilter && (
          <div className="modal-overlay" onClick={() => setDrillFilter(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
              <div className="modal-header">
                <h2>{drillLabels[drillFilter]} Recipients ({drillRecipients.length})</h2>
                <button className="modal-close" onClick={() => setDrillFilter(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                {/* Tag these contacts */}
                {drillContactIds.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      <Tags size={14} /> Tag these {drillContactIds.length} contacts
                    </div>
                    <TagInput
                      assignedTags={[]}
                      allTags={globalState.tags}
                      onAdd={handleDrillAddTag}
                      onRemove={() => {}}
                      onCreate={handleDrillCreateTag}
                      compact
                    />
                  </div>
                )}

                {/* Recipient list */}
                <div className="campaign-recipients-table-wrap" style={{ maxHeight: 320 }}>
                  <table className="campaign-recipients-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody className="responsive-table-body">
                      {drillRecipients.map(r => (
                        <tr key={r.id} className="responsive-table-row">
                          <td data-label="Name" className="responsive-table-cell primary-cell">
                            {r.contact
                              ? `${(r.contact as any).first_name} ${(r.contact as any).last_name}`
                              : '—'}
                          </td>
                          <td data-label="Email" className="responsive-table-cell">{r.email}</td>
                          <td data-label="Status" className="responsive-table-cell">
                            <span className="campaign-recipient-status" style={{ color: statusColor(r.status) }}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {drillRecipients.length === 0 && (
                        <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-tertiary)' }}>No recipients</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setDrillFilter(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
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
              {/* Tag filter dropdown */}
              {globalState.tags.length > 0 && (
                <div className="campaign-tag-filter">
                  <div className="campaign-tag-dropdown-wrap" ref={tagDropdownRef}>
                    <button
                      type="button"
                      className={`campaign-tag-dropdown-trigger${selectedTagIds.length > 0 ? ' has-tags' : ''}`}
                      onClick={() => { setTagDropdownOpen(o => !o); setTagSearchQuery(''); }}
                    >
                      <Tags size={14} />
                      {selectedTagIds.length > 0
                        ? `${selectedTagIds.length} tag${selectedTagIds.length !== 1 ? 's' : ''} selected`
                        : 'Filter by tags'}
                      <ChevronRight size={14} className={`campaign-tag-chevron${tagDropdownOpen ? ' open' : ''}`} />
                    </button>

                    {tagDropdownOpen && (
                      <div className="campaign-tag-dropdown">
                        <div className="campaign-tag-dropdown-search">
                          <Search size={13} />
                          <input
                            type="text"
                            placeholder="Search tags…"
                            value={tagSearchQuery}
                            onChange={e => setTagSearchQuery(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="campaign-tag-dropdown-list">
                          {globalState.tags
                            .filter(t => !tagSearchQuery.trim() || t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                            .map(tag => {
                              const count = tagContactCounts.get(tag.id) || 0;
                              const isActive = selectedTagIds.includes(tag.id);
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  className={`campaign-tag-dropdown-item${isActive ? ' active' : ''}`}
                                  onClick={() => handleTagToggle(tag.id)}
                                  disabled={count === 0}
                                >
                                  <span className="campaign-tag-dropdown-check">
                                    {isActive && <CheckCircle2 size={14} />}
                                  </span>
                                  <span className="campaign-tag-dropdown-name">{tag.name}</span>
                                  <span className="campaign-tag-dropdown-count">{count}</span>
                                </button>
                              );
                            })}
                          {globalState.tags.filter(t => !tagSearchQuery.trim() || t.name.toLowerCase().includes(tagSearchQuery.toLowerCase())).length === 0 && (
                            <div className="campaign-tag-dropdown-empty">No tags found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected tag pills */}
                  {selectedTagIds.length > 0 && (
                    <div className="campaign-tag-selected-pills">
                      {selectedTagIds.map(tid => {
                        const tag = globalState.tags.find(t => t.id === tid);
                        if (!tag) return null;
                        const count = tagContactCounts.get(tid) || 0;
                        return (
                          <span key={tid} className="campaign-tag-pill active">
                            {tag.name}
                            <span className="campaign-tag-pill-count">{count}</span>
                            <button
                              type="button"
                              className="campaign-tag-pill-remove"
                              onClick={() => handleTagToggle(tid)}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        );
                      })}
                      <button
                        type="button"
                        className="campaign-tag-clear"
                        onClick={() => {
                          setSelectedTagIds([]);
                          setSelectedRecipients([]);
                        }}
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              )}

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
                      {(c.tags || []).length > 0 && (
                        <span className="recipient-tags">
                          {(c.tags || []).map(t => (
                            <span key={t.id} className="recipient-tag-badge">{t.name}</span>
                          ))}
                        </span>
                      )}
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

/* ═══════════════════════════════════════════════════════
   Email Analytics Dashboard — Standalone Component
   ═══════════════════════════════════════════════════════ */

const CHART_COLORS = {
  primary: '#dc2626',
  opened: '#8b5cf6',
  clicked: '#10b981',
  delivered: '#3b82f6',
  failed: '#ef4444',
  bounced: '#f59e0b',
};

const RateTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="ea-tooltip">
        <p className="ea-tooltip-label">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="ea-tooltip-value" style={{ color: p.color }}>
            {p.name}: {p.value.toFixed(1)}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function EmailAnalyticsDashboard() {
  const [data, setData] = useState<EmailAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);
  const [attrWindow, setAttrWindow] = useState(1);
  const [chartMetric, setChartMetric] = useState<'openRate' | 'clickRate'>('openRate');
  const [showNumbers, setShowNumbers] = useState(true);
  const [tableSearch, setTableSearch] = useState('');
  const [tableSort, setTableSort] = useState<'openRate' | 'clickRate'>('openRate');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchEmailAnalytics(days, attrWindow);
      setData(result);
    } catch (err) {
      console.error('Failed to load email analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days, attrWindow]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading && !data) {
    return (
      <div className="ea-loading">
        <div className="loading-spinner" />
        <p>Crunching campaign numbers…</p>
      </div>
    );
  }

  if (!data || data.totalCampaigns === 0) {
    return (
      <div className="em-empty">
        <BarChart3 size={36} />
        <h3>No campaigns sent yet</h3>
        <p>Send your first campaign to see analytics here.</p>
      </div>
    );
  }

  // Sorted tables
  const topCampaigns = [...data.campaigns]
    .sort((a, b) => b[tableSort] - a[tableSort])
    .slice(0, 5);

  const filteredRecent = data.campaigns
    .filter(c => !tableSearch || c.name.toLowerCase().includes(tableSearch.toLowerCase()))
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

  // Engagement funnel
  const funnelMax = data.totalDelivered || 1;
  const funnelData = [
    { label: 'Delivered', value: data.totalDelivered, pct: 100, color: CHART_COLORS.delivered },
    { label: 'Opened', value: data.totalOpened, pct: (data.totalOpened / funnelMax) * 100, color: CHART_COLORS.opened },
    { label: 'Clicked', value: data.totalClicked, pct: (data.totalClicked / funnelMax) * 100, color: CHART_COLORS.clicked },
    { label: 'Ordered', value: data.totalOrders, pct: (data.totalOrders / funnelMax) * 100, color: CHART_COLORS.primary },
  ];

  const formatVal = (v: number, isRate: boolean) =>
    isRate ? `${v.toFixed(1)}%` : v.toLocaleString();

  return (
    <div className="ea-dashboard">
      {/* ── Controls Row ── */}
      <div className="ea-controls">
        <div className="ea-filter-group">
          <div className="ea-pill-group">
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                className={`ea-pill${days === d ? ' active' : ''}`}
                onClick={() => setDays(d)}
              >
                {d} Days
              </button>
            ))}
            <button
              className={`ea-pill${days === 9999 ? ' active' : ''}`}
              onClick={() => setDays(9999)}
            >
              All
            </button>
          </div>
        </div>
        <div className="ea-filter-group">
          <label className="ea-attr-label">Attribution Window</label>
          <select
            className="ea-attr-select"
            value={attrWindow}
            onChange={e => setAttrWindow(Number(e.target.value))}
          >
            <option value={1}>1 Day</option>
            <option value={3}>3 Days</option>
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
          </select>
          <button className="ea-refresh-btn" onClick={handleRefresh} disabled={refreshing} title="Refresh">
            <RefreshCw size={14} className={refreshing ? 'ea-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── 1. Conversion Summary ── */}
      <div className="ea-section">
        <div className="ea-section-header">
          <h3>Conversion Summary</h3>
          <p>Campaign success summarised by revenue and orders.</p>
        </div>
        <div className="ea-stat-grid">
          <div className="ea-stat-card">
            <div className="ea-stat-icon" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>
              <TrendingUp size={20} />
            </div>
            <div className="ea-stat-label">Revenue</div>
            <div className="ea-stat-value">£{data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="ea-stat-card">
            <div className="ea-stat-icon" style={{ background: 'rgba(139,92,246,0.08)', color: '#8b5cf6' }}>
              <ShoppingCart size={20} />
            </div>
            <div className="ea-stat-label">Avg. Order Value</div>
            <div className="ea-stat-value">£{data.avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="ea-stat-card">
            <div className="ea-stat-icon" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
              <MousePointerClick size={20} />
            </div>
            <div className="ea-stat-label">Order Rate</div>
            <div className="ea-stat-value">{data.orderRate.toFixed(2)}%</div>
          </div>
          <div className="ea-stat-card">
            <div className="ea-stat-icon" style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>
              <ShoppingCart size={20} />
            </div>
            <div className="ea-stat-label">Total Orders</div>
            <div className="ea-stat-value">{data.totalOrders}</div>
          </div>
        </div>
      </div>

      {/* ── 2. Engagement Summary ── */}
      <div className="ea-section">
        <div className="ea-section-header">
          <h3>Engagement Summary</h3>
          <p>Performance summary of recipient engagement, including open rates, click activity, and conversions.</p>
        </div>
        <div className="ea-funnel-wrap">
          <div className="ea-funnel-bars">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <span className="ea-funnel-pct-label hide-on-mobile">Cumulative</span>
            </div>
            {funnelData.map(f => {
              const displayPct = f.pct > 0 && f.pct < 1 ? '<1%' : `${f.pct.toFixed(0)}%`;
              return (
                <div className="ea-funnel-row" key={f.label}>
                  <span className="ea-funnel-label">{f.label}</span>
                  <div className="ea-funnel-track">
                    <div
                      className="ea-funnel-fill"
                      style={{ width: `${Math.max(f.pct, 2)}%`, background: f.color }}
                    />
                  </div>
                  <div className="ea-funnel-pct-pill">
                    {displayPct}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. Performance Analysis ── */}
      <div className="ea-section">
        <div className="ea-section-header">
          <h3>Performance Analysis</h3>
          <p>Track campaign performance trends for a metric over time.</p>
        </div>
        <div className="ea-stat-grid">
          <div className="ea-stat-card">
            <div className="ea-stat-icon" style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>
              <Send size={20} />
            </div>
            <div className="ea-stat-label">Emails Delivered</div>
            <div className="ea-stat-value">{data.totalDelivered.toLocaleString()}</div>
          </div>
          <div className="ea-stat-card">
            <div className="ea-stat-icon" style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}>
              <AlertTriangle size={20} />
            </div>
            <div className="ea-stat-label">Bounced</div>
            <div className="ea-stat-value">{data.totalBounced.toLocaleString()}</div>
          </div>
          <div className="ea-stat-card">
            <div className="ea-stat-icon" style={{ background: 'rgba(139,92,246,0.08)', color: '#8b5cf6' }}>
              <Eye size={20} />
            </div>
            <div className="ea-stat-label">Avg. Open Rate</div>
            <div className="ea-stat-value">{data.avgOpenRate.toFixed(1)}%</div>
          </div>
          <div className="ea-stat-card">
            <div className="ea-stat-icon" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
              <XCircle size={20} />
            </div>
            <div className="ea-stat-label">Failed</div>
            <div className="ea-stat-value">{data.totalFailed.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* ── 4. Open/Click Rate Chart ── */}
      {data.openRateByDate.length > 0 && (
        <div className="ea-section">
          <div className="ea-section-header ea-row-between">
            <div>
              <h3>{chartMetric === 'openRate' ? 'Open' : 'Click'} Rate (for Email Campaigns)</h3>
            </div>
            <select
              className="ea-attr-select"
              value={chartMetric}
              onChange={e => setChartMetric(e.target.value as any)}
            >
              <option value="openRate">Open Rate</option>
              <option value="clickRate">Click Rate</option>
            </select>
          </div>
          <div className="ea-chart-container">
            <div className="ea-chart-summary">
              <div className="ea-chart-big-stat">
                <div className="ea-chart-big-label">{chartMetric === 'openRate' ? 'Open' : 'Click'} Rate</div>
                <div className="ea-chart-big-value">
                  {(chartMetric === 'openRate' ? data.avgOpenRate : data.avgClickRate).toFixed(2)}%
                </div>
              </div>
              <div className="ea-chart-details">
                <div><span>Total Opened:</span> <strong>{data.totalOpened.toLocaleString()}</strong></div>
                <div><span>Total Delivery:</span> <strong>{data.totalDelivered.toLocaleString()}</strong></div>
              </div>
            </div>
            <div className="ea-chart-graph">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.openRateByDate} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.delivered} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.delivered} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                    minTickGap={40}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                    tickFormatter={v => `${v}%`}
                    width={40}
                  />
                  <Tooltip content={<RateTooltip />} />
                  <Area
                    type="monotone"
                    dataKey={chartMetric}
                    name={chartMetric === 'openRate' ? 'Open Rate' : 'Click Rate'}
                    stroke={CHART_COLORS.delivered}
                    strokeWidth={2}
                    fill="url(#rateGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Top Performing Emails ── */}
      <div className="ea-section">
        <div className="ea-section-header ea-row-between">
          <div>
            <h3>Top Performing Emails</h3>
            <p>List of top performing emails based on {tableSort === 'openRate' ? 'Open Rate' : 'Click Rate'}</p>
          </div>
          <select
            className="ea-attr-select"
            value={tableSort}
            onChange={e => setTableSort(e.target.value as any)}
          >
            <option value="openRate">Open Rate</option>
            <option value="clickRate">Click Rate</option>
          </select>
        </div>
        <div className="ea-table-controls">
          <label className="ea-toggle-label">
            <div className={`ea-toggle${showNumbers ? ' active' : ''}`} onClick={() => setShowNumbers(!showNumbers)}>
              <div className="ea-toggle-dot" />
            </div>
            Show statistics in numbers
          </label>
        </div>
        <div className="ea-table-wrap">
          <table className="ea-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Execution Date</th>
                <th>Delivered</th>
                <th>Open Rate</th>
                <th>Click Rate</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topCampaigns.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="ea-table-title">
                      <Calendar size={14} />
                      {c.name}
                    </div>
                  </td>
                  <td>{new Date(c.sentAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })} {new Date(c.sentAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{c.delivered.toLocaleString()}</td>
                  <td>{showNumbers ? c.opened.toLocaleString() : formatVal(c.openRate, true)}</td>
                  <td>{showNumbers ? c.clicked.toLocaleString() : formatVal(c.clickRate, true)}</td>
                  <td>{c.revenue > 0 ? `£${c.revenue.toFixed(0)}` : '0'}</td>
                </tr>
              ))}
              {topCampaigns.length === 0 && (
                <tr><td colSpan={6} className="ea-table-empty">No campaigns in this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 6. Most Recent Emails ── */}
      <div className="ea-section">
        <div className="ea-section-header ea-row-between">
          <div>
            <h3>Most Recent Emails</h3>
            <p>Latest campaign metrics for quick comparison, regardless of time range</p>
          </div>
          <div className="ea-search-wrap">
            <Search size={14} />
            <input
              className="ea-search-input"
              placeholder="Search Campaign Name"
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="ea-table-controls">
          <label className="ea-toggle-label">
            <div className={`ea-toggle${showNumbers ? ' active' : ''}`} onClick={() => setShowNumbers(!showNumbers)}>
              <div className="ea-toggle-dot" />
            </div>
            Show statistics in numbers
          </label>
        </div>
        <div className="ea-table-wrap">
          <table className="ea-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Execution Date</th>
                <th>Recipients</th>
                <th>Open Rate</th>
                <th>Click Rate</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecent.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="ea-table-title">
                      <Calendar size={14} />
                      {c.name}
                    </div>
                  </td>
                  <td>{new Date(c.sentAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })} {new Date(c.sentAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{c.totalRecipients.toLocaleString()}</td>
                  <td>{showNumbers ? c.opened.toLocaleString() : formatVal(c.openRate, true)}</td>
                  <td>{showNumbers ? c.clicked.toLocaleString() : formatVal(c.clickRate, true)}</td>
                  <td>{c.revenue > 0 ? `£${c.revenue.toFixed(0)}` : '0'}</td>
                </tr>
              ))}
              {filteredRecent.length === 0 && (
                <tr><td colSpan={6} className="ea-table-empty">No campaigns found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
