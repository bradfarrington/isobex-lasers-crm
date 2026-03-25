import { useState, useEffect, useCallback } from 'react';
import { useAlert } from '@/components/ui/AlertDialog';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CampaignsTab } from './CampaignsTab';
import {
  fetchEmailTemplates,
  deleteEmailTemplate,
  createEmailTemplate,
} from '@/lib/api';
import type { EmailTemplate } from '@/types/database';
import {
  Mail, FileText, BarChart3, Plus, Pencil, Copy, Trash2,
  Layers, Lock,
} from 'lucide-react';
import './EmailMarketingPage.css';

export function EmailMarketingPage() {
  const { showConfirm } = useAlert();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  const [subTab, setSubTab] = useState<'templates' | 'campaigns' | 'analytics'>(
    (urlTab as any) || 'templates'
  );
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchEmailTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleDelete = async (e: React.MouseEvent, t: EmailTemplate) => {
    e.stopPropagation();
    const ok = await showConfirm({ title: 'Delete Template', message: `Delete "${t.name}"? This cannot be undone.`, variant: 'danger', confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await deleteEmailTemplate(t.id);
      setTemplates(prev => prev.filter(x => x.id !== t.id));
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, t: EmailTemplate) => {
    e.stopPropagation();
    try {
      const dup = await createEmailTemplate({
        name: `${t.name} (Copy)`,
        subject: t.subject,
        blocks: t.blocks,
        settings: t.settings,
        mjml_source: t.mjml_source,
        active: true,
      });
      setTemplates(prev => [dup, ...prev]);
    } catch (err) {
      console.error('Failed to duplicate template:', err);
    }
  };

  return (
    <>
      <div className="em-header">
        <div className="em-header-left">
          <h1 className="em-header-title">Email Marketing</h1>
          <div className="em-subtabs">
            <button
              className={`em-subtab${subTab === 'templates' ? ' active' : ''}`}
              onClick={() => setSubTab('templates')}
            >
              <FileText size={13} /> Templates
            </button>
            <button
              className={`em-subtab${subTab === 'campaigns' ? ' active' : ''}`}
              onClick={() => setSubTab('campaigns')}
            >
              <Mail size={13} /> Campaigns
            </button>
            <button
              className={`em-subtab${subTab === 'analytics' ? ' active' : ''}`}
              onClick={() => setSubTab('analytics')}
            >
              <BarChart3 size={13} /> Analytics
            </button>
          </div>
        </div>

        <div className="em-header-right">
          {subTab === 'templates' && (
            <button
              className="btn-secondary"
              style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}
              onClick={() => navigate('/email-marketing/builder')}
            >
              <Plus size={14} /> New Template
            </button>
          )}
        </div>
      </div>

      {/* ── Templates Sub-tab ── */}
      {subTab === 'templates' && (
        <div className="em-content">
          {loading ? (
            <div className="em-empty">
              <div className="loading-spinner" />
              <p>Loading templates…</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="em-empty">
              <Mail size={36} />
              <h3>No email templates yet</h3>
              <p>Create your first email template to start building campaigns.</p>
              <button
                className="btn-secondary"
                style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}
                onClick={() => navigate('/email-marketing/builder')}
              >
                <Plus size={14} /> New Template
              </button>
            </div>
          ) : (
            <div className="em-template-list">
              {/* System templates first */}
              {templates.filter(t => t.is_system).length > 0 && (
                <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', fontWeight: 700, padding: '0.25rem 0', marginBottom: '0.25rem' }}>
                  <Lock size={10} style={{ verticalAlign: -1, marginRight: 4 }} />System Templates
                </div>
              )}
              {[...templates.filter(t => t.is_system), ...templates.filter(t => !t.is_system)].map(t => {
                const blockCount = Array.isArray(t.blocks) ? t.blocks.length : 0;
                return (
                  <div
                    key={t.id}
                    className="em-template-card"
                    onClick={() => navigate(`/email-marketing/builder/${t.id}`)}
                  >
                    <div className="em-template-avatar">
                      {t.is_system ? <Lock size={18} /> : <Mail size={18} />}
                    </div>
                    <div className="em-template-info">
                      <div className="em-template-header">
                        <h4>{t.name}</h4>
                        {t.is_system && <span className="em-badge system">System</span>}
                        {!t.active && <span className="em-badge inactive">Inactive</span>}
                      </div>
                      <p className="em-template-subject">
                        Subject: {t.subject || '(no subject)'}
                      </p>
                      <div className="em-template-meta">
                        {blockCount > 0 && (
                          <span><Layers size={11} /> {blockCount} block{blockCount !== 1 ? 's' : ''}</span>
                        )}
                        <span>{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="em-template-actions">
                      <button
                        className="row-action-btn"
                        title="Duplicate"
                        onClick={(e) => handleDuplicate(e, t)}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        className="row-action-btn"
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); navigate(`/email-marketing/builder/${t.id}`); }}
                      >
                        <Pencil size={14} />
                      </button>
                      {!t.is_system && (
                        <button
                          className="row-action-btn danger"
                          title="Delete"
                          onClick={(e) => handleDelete(e, t)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Campaigns Sub-tab ── */}
      {subTab === 'campaigns' && (
        <div className="em-content">
          <CampaignsTab />
        </div>
      )}

      {/* ── Analytics Sub-tab ── */}
      {subTab === 'analytics' && (
        <div className="em-content">
          <CampaignsTab activeSubTab="analytics" />
        </div>
      )}
    </>
  );
}
