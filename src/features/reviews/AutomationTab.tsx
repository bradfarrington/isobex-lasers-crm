import React, { useState, useEffect, useRef } from 'react';
import { useAlert } from '@/components/ui/AlertDialog';
import * as api from '@/lib/api';
import type { ReviewAutomationSettings, ReviewRequest } from '@/types/database';
import {
  Loader2, Power, Clock, RefreshCw, Hash, MousePointerClick,
  Save, Zap, Info, FileText, Users,
} from 'lucide-react';

interface TemplateSummary {
  id: string;
  name: string;
  is_system: boolean;
  system_key: string | null;
}

interface StagePerson {
  name: string;
  email: string;
}

/* ── Small hover popover showing names ── */
function PeopleBadge({ people }: { people: StagePerson[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      className="timeline-people-badge"
      ref={ref}
      onMouseEnter={() => people.length > 0 && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Users size={12} />
      <span>{people.length}</span>
      {open && (
        <div className="timeline-people-popover">
          <div className="timeline-people-title">{people.length} customer{people.length !== 1 ? 's' : ''}</div>
          <ul className="timeline-people-list">
            {people.map((p, i) => (
              <li key={i}>
                <span className="timeline-person-name">{p.name}</span>
                <span className="timeline-person-email">{p.email}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Categorise requests into stages ── */
function categoriseByStage(requests: ReviewRequest[], maxFollowUps: number) {
  const stages: Record<string, StagePerson[]> = {
    first_send: [],
    completed: [],
  };

  // Create dynamic follow-up buckets
  for (let i = 1; i <= maxFollowUps; i++) {
    stages[`followup_${i}`] = [];
  }

  for (const r of requests) {
    if (r.source !== 'automated') continue;

    const person: StagePerson = { name: r.contact_name, email: r.contact_email };

    if (r.sequence_completed || r.status === 'clicked') {
      stages.completed.push(person);
    } else if (r.send_count <= 1) {
      stages.first_send.push(person);
    } else {
      // send_count 2 = follow-up #1, 3 = #2, etc.
      const followUpNum = r.send_count - 1;
      const key = `followup_${Math.min(followUpNum, maxFollowUps)}`;
      if (stages[key]) {
        stages[key].push(person);
      } else {
        // Overflow into last bucket
        const lastKey = `followup_${maxFollowUps}`;
        if (stages[lastKey]) stages[lastKey].push(person);
      }
    }
  }

  return stages;
}

export function AutomationTab() {
  const { showAlert } = useAlert();
  const [settings, setSettings] = useState<ReviewAutomationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [requests, setRequests] = useState<ReviewRequest[]>([]);

  // Local draft state for form inputs
  const [draft, setDraft] = useState({
    enabled: false,
    initial_delay_days: 7,
    follow_up_interval_days: 3,
    max_follow_ups: 3,
    stop_on_click: true,
    template_id: null as string | null,
  });

  useEffect(() => {
    Promise.all([
      api.fetchReviewAutomationSettings(),
      api.fetchEmailTemplates(),
      api.fetchReviewRequests(),
    ])
      .then(([s, tpls, reqs]) => {
        setSettings(s);
        setDraft({
          enabled: s.enabled,
          initial_delay_days: s.initial_delay_days,
          follow_up_interval_days: s.follow_up_interval_days,
          max_follow_ups: s.max_follow_ups,
          stop_on_click: s.stop_on_click,
          template_id: s.template_id,
        });
        setTemplates(tpls.map((t: any) => ({
          id: t.id,
          name: t.name,
          is_system: t.is_system,
          system_key: t.system_key || null,
        })));
        setRequests(reqs);
      })
      .catch((err) => showAlert({ title: 'Error', message: err.message, variant: 'danger' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateReviewAutomationSettings(draft);
      setSettings(updated);
      showAlert({ title: 'Saved', message: 'Automation settings updated successfully.', variant: 'success' });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message || 'Failed to save settings', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = settings && (
    draft.enabled !== settings.enabled ||
    draft.initial_delay_days !== settings.initial_delay_days ||
    draft.follow_up_interval_days !== settings.follow_up_interval_days ||
    draft.max_follow_ups !== settings.max_follow_ups ||
    draft.stop_on_click !== settings.stop_on_click ||
    draft.template_id !== settings.template_id
  );

  const selectedTemplateName = draft.template_id
    ? templates.find(t => t.id === draft.template_id)?.name || 'Selected Template'
    : null;

  const stages = categoriseByStage(requests, draft.max_follow_ups);

  if (loading) {
    return (
      <div className="reviews-loading">
        <Loader2 size={32} className="spin" />
        <p>Loading automation settings…</p>
      </div>
    );
  }

  return (
    <div className="automation-tab">
      {/* Info banner */}
      <div className="automation-info-banner">
        <Info size={16} />
        <span>
          When enabled, review request emails are automatically sent to customers after their order is fulfilled.
          Follow-up reminders continue until the customer clicks the review link or the maximum follow-ups are reached.
        </span>
      </div>

      <div className="automation-layout">
        {/* Settings Card */}
        <div className="automation-card">
          <div className="automation-card-header">
            <Zap size={18} />
            <h4>Workflow Configuration</h4>
          </div>

          {/* Master Toggle */}
          <div className="automation-field automation-toggle-row">
            <div className="automation-field-info">
              <div className="automation-field-label">
                <Power size={14} />
                Enable Automation
              </div>
              <div className="automation-field-description">
                Automatically send review requests after orders are completed
              </div>
            </div>
            <label className="automation-toggle">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              <span className="automation-toggle-slider" />
            </label>
          </div>

          <div className="automation-divider" />

          {/* Email Template */}
          <div className="automation-field">
            <div className="automation-field-info">
              <div className="automation-field-label">
                <FileText size={14} />
                Email Template
              </div>
              <div className="automation-field-description">
                Choose which email template to send. Defaults to the system "Review Request" template.
              </div>
            </div>
            <div className="automation-field-input" style={{ minWidth: 200 }}>
              <select
                className="form-input"
                value={draft.template_id || ''}
                onChange={(e) => setDraft({ ...draft, template_id: e.target.value || null })}
                style={{ width: '100%' }}
              >
                <option value="">System Default (Review Request)</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.is_system ? ' ⚙️' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="automation-divider" />

          {/* Initial delay */}
          <div className="automation-field">
            <div className="automation-field-info">
              <div className="automation-field-label">
                <Clock size={14} />
                Initial Delay
              </div>
              <div className="automation-field-description">
                Days to wait after an order is paid before sending the first review request
              </div>
            </div>
            <div className="automation-field-input">
              <input
                type="number"
                className="form-input"
                min={1}
                max={90}
                value={draft.initial_delay_days}
                onChange={(e) => setDraft({ ...draft, initial_delay_days: Math.max(1, Number(e.target.value)) })}
              />
              <span className="automation-input-suffix">days</span>
            </div>
          </div>

          {/* Follow-up interval */}
          <div className="automation-field">
            <div className="automation-field-info">
              <div className="automation-field-label">
                <RefreshCw size={14} />
                Follow-Up Interval
              </div>
              <div className="automation-field-description">
                Days between each follow-up email if the customer hasn't clicked
              </div>
            </div>
            <div className="automation-field-input">
              <input
                type="number"
                className="form-input"
                min={1}
                max={30}
                value={draft.follow_up_interval_days}
                onChange={(e) => setDraft({ ...draft, follow_up_interval_days: Math.max(1, Number(e.target.value)) })}
              />
              <span className="automation-input-suffix">days</span>
            </div>
          </div>

          {/* Max follow-ups */}
          <div className="automation-field">
            <div className="automation-field-info">
              <div className="automation-field-label">
                <Hash size={14} />
                Maximum Follow-Ups
              </div>
              <div className="automation-field-description">
                Total number of follow-up reminders after the initial email
              </div>
            </div>
            <div className="automation-field-input">
              <input
                type="number"
                className="form-input"
                min={0}
                max={10}
                value={draft.max_follow_ups}
                onChange={(e) => setDraft({ ...draft, max_follow_ups: Math.max(0, Number(e.target.value)) })}
              />
              <span className="automation-input-suffix">emails</span>
            </div>
          </div>

          <div className="automation-divider" />

          {/* Stop on click */}
          <div className="automation-field automation-toggle-row">
            <div className="automation-field-info">
              <div className="automation-field-label">
                <MousePointerClick size={14} />
                Stop on Click
              </div>
              <div className="automation-field-description">
                Stop sending follow-ups once the customer clicks the review link
              </div>
            </div>
            <label className="automation-toggle">
              <input
                type="checkbox"
                checked={draft.stop_on_click}
                onChange={(e) => setDraft({ ...draft, stop_on_click: e.target.checked })}
              />
              <span className="automation-toggle-slider" />
            </label>
          </div>

          {/* Save button */}
          <div className="automation-save-row">
            <button
              className="btn-brand"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <><Loader2 size={16} className="spin" /> Saving…</>
              ) : (
                <><Save size={16} /> Save Settings</>
              )}
            </button>
          </div>
        </div>

        {/* Timeline Preview */}
        <div className="automation-card automation-preview-card">
          <div className="automation-card-header">
            <Clock size={18} />
            <h4>Sequence Preview</h4>
          </div>
          <div className="automation-timeline">
            {/* Order Completed */}
            <div className="timeline-item">
              <div className="timeline-dot active" />
              <div className="timeline-content">
                <div className="timeline-label-row">
                  <div className="timeline-label">Order Completed</div>
                </div>
                <div className="timeline-desc">Customer pays for their order</div>
              </div>
            </div>

            <div className="timeline-connector">
              <span className="timeline-wait">{draft.initial_delay_days} day{draft.initial_delay_days !== 1 ? 's' : ''}</span>
            </div>

            {/* First Review Request */}
            <div className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-content">
                <div className="timeline-label-row">
                  <div className="timeline-label">First Review Request</div>
                  <PeopleBadge people={stages.first_send} />
                </div>
                <div className="timeline-desc">
                  {selectedTemplateName
                    ? <>Using: <strong>{selectedTemplateName}</strong></>
                    : 'System default template'}
                </div>
              </div>
            </div>

            {Array.from({ length: draft.max_follow_ups }).map((_, idx) => {
              const followUpNum = idx + 1;
              const isLast = followUpNum === draft.max_follow_ups;
              return (
                <React.Fragment key={`followup-${followUpNum}`}>
                  <div className="timeline-connector">
                    <span className="timeline-wait">{draft.follow_up_interval_days} day{draft.follow_up_interval_days !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="timeline-item">
                    <div className={isLast ? "timeline-dot last" : "timeline-dot"} />
                    <div className="timeline-content">
                      <div className="timeline-label-row">
                        <div className="timeline-label">Follow-Up #{followUpNum}</div>
                        <PeopleBadge people={stages[`followup_${Math.min(followUpNum, draft.max_follow_ups)}`] || []} />
                      </div>
                      <div className="timeline-desc">
                        {isLast 
                          ? 'Final follow-up — sequence ends' 
                          : `Reminder email${draft.stop_on_click ? ' (skipped if already clicked)' : ''}`}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            <div className="timeline-connector">
              <span className="timeline-wait">end</span>
            </div>

            {/* Sequence Complete */}
            <div className="timeline-item">
              <div className="timeline-dot done" />
              <div className="timeline-content">
                <div className="timeline-label-row">
                  <div className="timeline-label">Sequence Complete</div>
                  <PeopleBadge people={stages.completed} />
                </div>
                <div className="timeline-desc">
                  Total duration: ~{draft.initial_delay_days + (draft.follow_up_interval_days * draft.max_follow_ups)} days
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
