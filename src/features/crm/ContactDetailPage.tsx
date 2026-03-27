import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { useData } from '@/context/DataContext';
import { useAlert } from '@/components/ui/AlertDialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { InlineEdit } from '@/components/ui/InlineEdit';
import { TagInput } from '@/components/ui/TagInput';
import * as api from '@/lib/api';
import type { Contact, ContactUpdate, Tag } from '@/types/database';
import { ContactDocumentsTab } from './ContactDocumentsTab';
import { ContactDealsTab } from './ContactDealsTab';
import { ContactOrdersTab } from './ContactOrdersTab';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  MessageSquare,
  FileText,
  Clock,
  Trash2,
  User,
  Target,
  Activity,
  UserCheck,
  Tags,
} from 'lucide-react';
import './ContactDetailPage.css';

type DetailTab = 'overview' | 'notes' | 'comms' | 'orders' | 'documents' | 'deals';

const tabs: { key: DetailTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'notes', label: 'Notes & Activity' },
  { key: 'comms', label: 'Communications' },
  { key: 'orders', label: 'Orders & Jobs' },
  { key: 'documents', label: 'Documents' },
  { key: 'deals', label: 'Deals' },
];

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useData();
  const { showConfirm } = useAlert();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  // Try to find in context first, then fetch from API
  useEffect(() => {
    if (!id) return;

    const fromContext = state.contacts.find((c) => c.id === id);
    if (fromContext) {
      setContact(fromContext);
      setLoading(false);
      return;
    }

    // If context isn't loaded yet or contact not found, fetch directly
    if (!state.loading) {
      api
        .fetchContact(id)
        .then((data) => {
          setContact(data);
        })
        .catch(() => {
          navigate('/crm', { replace: true });
        })
        .finally(() => setLoading(false));
    }
  }, [id, state.contacts, state.loading, navigate]);

  // Keep local state in sync with context updates (e.g. after edit)
  useEffect(() => {
    if (!id) return;
    const updated = state.contacts.find((c) => c.id === id);
    if (updated) {
      setContact(updated);
    }
  }, [state.contacts, id]);

  const handleSaveField = async (field: keyof ContactUpdate, value: any) => {
    if (!contact) return;
    try {
      const updated = await api.updateContact(contact.id, { [field]: value });
      dispatch({ type: 'UPDATE_CONTACT', payload: updated });
    } catch (err) {
      console.error('Failed to update field:', err);
    }
  };

  // ── Tag handlers ──
  const handleAddTag = async (tagId: string) => {
    if (!contact) return;
    try {
      await api.addTagToContacts(tagId, [contact.id]);
      // Refresh the contact to get updated tags
      const updated = await api.fetchContact(contact.id);
      dispatch({ type: 'UPDATE_CONTACT', payload: updated });
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!contact) return;
    try {
      await api.removeTagFromContact(contact.id, tagId);
      const updated = await api.fetchContact(contact.id);
      dispatch({ type: 'UPDATE_CONTACT', payload: updated });
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  const handleCreateTag = async (name: string): Promise<Tag> => {
    const tag = await api.createTag(name);
    dispatch({ type: 'ADD_TAG', payload: tag });
    return tag;
  };

  const handleDelete = async () => {
    if (!contact) return;
    const ok = await showConfirm({
      title: 'Delete Contact',
      message: `Are you sure you want to delete ${contact.first_name} ${contact.last_name}?`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await api.deleteContact(contact.id);
      dispatch({ type: 'DELETE_CONTACT', payload: contact.id });
      navigate('/crm', { replace: true });
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  const initials = useMemo(() => {
    if (!contact) return '';
    return (contact.first_name[0] + contact.last_name[0]).toUpperCase();
  }, [contact]);

  const createdDate = useMemo(() => {
    if (!contact) return '';
    return new Date(contact.created_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [contact]);

  const updatedDate = useMemo(() => {
    if (!contact) return '';
    return new Date(contact.updated_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [contact]);

  if (loading || state.loading) {
    return (
      <PageShell title="Contact">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading contact…</p>
        </div>
      </PageShell>
    );
  }

  if (!contact) {
    return (
      <PageShell title="Contact Not Found">
        <div className="data-table-empty">
          <User size={48} />
          <h3>Contact not found</h3>
          <p>This contact may have been deleted.</p>
          <Link to="/crm" className="btn-primary" style={{ marginTop: 16 }}>
            Back to Contacts
          </Link>
        </div>
      </PageShell>
    );
  }

  const isLead = contact.contact_type === 'Lead';

  // ── Card header helper ──
  const cardHeader = (
    icon: React.ReactNode,
    title: string
  ) => (
    <div className="contact-detail-card-header">
      <div className="contact-detail-card-title">
        {icon}
        {title}
      </div>
    </div>
  );

  // ══════════════════════════════════════════
  //  TAB CONTENT RENDERERS
  // ══════════════════════════════════════════

  const renderOverview = () => (
    <div className="contact-detail-grid">
      {/* Contact Details Card */}
      <div className="contact-detail-card">
        {cardHeader(<User size={14} />, 'Contact Details')}

        <div className="contact-detail-field">
          <div className="contact-detail-field-label">First Name</div>
          <InlineEdit
            value={contact.first_name}
            onSave={(val) => handleSaveField('first_name', val)}
            renderView={() => <div className="contact-detail-field-value">{contact.first_name || 'Unknown'}</div>}
            renderInput={({ value, onChange, onBlur, onKeyDown, autoFocus }) => (
              <input
                className="card-field-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                autoFocus={autoFocus}
              />
            )}
          />
        </div>

        <div className="contact-detail-field">
          <div className="contact-detail-field-label">Last Name</div>
          <InlineEdit
            value={contact.last_name || ''}
            onSave={(val) => handleSaveField('last_name', val || null)}
            renderView={() => <div className="contact-detail-field-value">{contact.last_name || 'Unknown'}</div>}
            renderInput={({ value, onChange, onBlur, onKeyDown, autoFocus }) => (
              <input
                className="card-field-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                autoFocus={autoFocus}
              />
            )}
          />
        </div>

        <div className="contact-detail-field">
          <div className="contact-detail-field-label">Email</div>
          <InlineEdit
            value={contact.email || ''}
            onSave={(val) => handleSaveField('email', val || null)}
            renderView={() => (
              <div className={`contact-detail-field-value ${!contact.email ? 'empty' : ''}`}>
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Mail size={12} />
                    {contact.email}
                  </a>
                ) : 'Not provided'}
              </div>
            )}
            renderInput={({ value, onChange, onBlur, onKeyDown, autoFocus }) => (
              <input
                className="card-field-input"
                type="email"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                autoFocus={autoFocus}
              />
            )}
          />
        </div>

        <div className="contact-detail-field">
          <div className="contact-detail-field-label">Phone</div>
          <InlineEdit
            value={contact.phone || ''}
            onSave={(val) => handleSaveField('phone', val || null)}
            renderView={() => (
              <div className={`contact-detail-field-value ${!contact.phone ? 'empty' : ''}`}>
                {contact.phone ? (
                  <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={12} />
                    {contact.phone}
                  </a>
                ) : 'Not provided'}
              </div>
            )}
            renderInput={({ value, onChange, onBlur, onKeyDown, autoFocus }) => (
              <input
                className="card-field-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                autoFocus={autoFocus}
              />
            )}
          />
        </div>

        {!isLead && (
          <div className="contact-detail-field">
            <div className="contact-detail-field-label">Company</div>
            <InlineEdit
              value={contact.company_id || ''}
              onSave={(val) => handleSaveField('company_id', val || null)}
              renderView={() => (
                <div className={`contact-detail-field-value ${!contact.company ? 'empty' : ''}`}>
                  {contact.company ? (
                    <>
                      <Building2 size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                      {contact.company.name}
                    </>
                  ) : 'No company linked'}
                </div>
              )}
              renderInput={({ value, onSaveAndClose }) => (
                <div onClick={e => e.stopPropagation()}>
                  <SearchableSelect
                    className="card-field-input"
                    value={value}
                    onChange={(val) => onSaveAndClose(val)}
                    options={state.companies.map((company) => ({ label: company.name, value: company.id }))}
                    placeholder="No company"
                  />
                </div>
              )}
            />
          </div>
        )}
      </div>

      {/* Tags Card */}
      <div className="contact-detail-card">
        {cardHeader(<Tags size={14} />, 'Tags')}
        <div style={{ padding: '0 var(--space-1)' }}>
          <TagInput
            assignedTags={contact.tags || []}
            allTags={state.tags}
            onAdd={handleAddTag}
            onRemove={handleRemoveTag}
            onCreate={handleCreateTag}
          />
        </div>
      </div>

      {/* Lead Information Card — leads only */}
      {isLead && (
        <div className="contact-detail-card">
          {cardHeader(<Target size={14} />, 'Lead Information')}

          <div className="contact-detail-field">
            <div className="contact-detail-field-label">Source</div>
            <InlineEdit
              value={contact.source || ''}
              onSave={(val) => handleSaveField('source', val || null)}
              renderView={() => (
                <div className={`contact-detail-field-value ${!contact.source ? 'empty' : ''}`}>
                  {contact.source || 'Unknown'}
                </div>
              )}
              renderInput={({ value, onChange, onBlur }) => (
                <select
                  className="card-field-input"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onBlur={onBlur}
                  autoFocus
                >
                  <option value="">Select source</option>
                  {state.leadSources.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              )}
            />
          </div>

          <div className="contact-detail-field">
            <div className="contact-detail-field-label">Status</div>
            <InlineEdit
              value={contact.status || ''}
              onSave={(val) => handleSaveField('status', val || null)}
              renderView={() => (
                <div className={`contact-detail-field-value ${!contact.status ? 'empty' : ''}`}>
                  {contact.status ? (
                    <span className="status-badge">{contact.status}</span>
                  ) : 'No status'}
                </div>
              )}
              renderInput={({ value, onChange, onBlur }) => (
                <select
                  className="card-field-input"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onBlur={onBlur}
                  autoFocus
                >
                  <option value="">Select status</option>
                  {state.leadStatuses.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              )}
            />
          </div>
        </div>
      )}

      {/* Company Card — customers with company only */}
      {!isLead && contact.company && (
        <div className="contact-detail-card">
          {cardHeader(<Building2 size={14} />, 'Company')}
          <div className="contact-detail-field">
            <div className="contact-detail-field-label">Name</div>
            <div className="contact-detail-field-value">
              {contact.company.name}
            </div>
          </div>
          {contact.company.industry && (
            <div className="contact-detail-field">
              <div className="contact-detail-field-label">Industry</div>
              <div className="contact-detail-field-value">
                {contact.company.industry}
              </div>
            </div>
          )}
          {contact.company.phone && (
            <div className="contact-detail-field">
              <div className="contact-detail-field-label">Company Phone</div>
              <div className="contact-detail-field-value">
                <a href={`tel:${contact.company.phone}`}>
                  <Phone size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                  {contact.company.phone}
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Record Info Card */}
      <div className="contact-detail-card">
        {cardHeader(<Clock size={14} />, 'Record Info')}
        <div className="contact-detail-field">
          <div className="contact-detail-field-label">Created</div>
          <div className="contact-detail-field-value">{createdDate}</div>
        </div>
        <div className="contact-detail-field">
          <div className="contact-detail-field-label">Last Updated</div>
          <div className="contact-detail-field-value">{updatedDate}</div>
        </div>
      </div>
    </div>
  );

  const renderNotes = () => (
    <div className="contact-detail-grid single-column">
      {/* Notes Card */}
      <div className="contact-detail-card full-width">
        {cardHeader(<FileText size={14} />, 'Notes')}

        <InlineEdit
          value={contact.notes || ''}
          onSave={(val) => handleSaveField('notes', val || null)}
          renderView={() => (
            <div className="contact-detail-message">
              {contact.notes || 'No notes yet. Click here to add notes.'}
            </div>
          )}
          renderInput={({ value, onChange, onBlur, onKeyDown, autoFocus }) => (
            <textarea
              className="card-field-textarea"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
              placeholder="Add notes about this contact…"
              rows={6}
              autoFocus={autoFocus}
            />
          )}
        />
      </div>

      {/* Activity placeholder */}
      <div className="contact-detail-card full-width">
        {cardHeader(<Activity size={14} />, 'Activity Timeline')}
        <div className="tab-placeholder">
          <Activity size={32} />
          <h4>Activity tracking coming soon</h4>
          <p>Status changes, emails sent, and other events will be logged here automatically.</p>
        </div>
      </div>
    </div>
  );

  const renderComms = () => (
    <div className="contact-detail-grid single-column">
      {/* Enquiry message — leads */}
      {isLead && contact.message && (
        <div className="contact-detail-card full-width">
          {cardHeader(<MessageSquare size={14} />, 'Enquiry Message')}
          <div className="contact-detail-message">{contact.message}</div>
        </div>
      )}

      {/* Email history placeholder */}
      <div className="contact-detail-card full-width">
        {cardHeader(<Mail size={14} />, 'Email History')}
        <div className="tab-placeholder">
          <Mail size={32} />
          <h4>Email history coming soon</h4>
          <p>Emails sent to this contact via campaigns or direct mail will appear here.</p>
        </div>
      </div>
    </div>
  );

  const renderOrders = () => (
    <ContactOrdersTab contactId={contact.id} />
  );

  const renderDocuments = () => (
    <ContactDocumentsTab contactId={contact.id} />
  );

  return (
    <div className="page-shell">
      {/* Back link */}
      <Link to="/crm" className="contact-detail-back">
        <ArrowLeft size={16} />
        Back to Contacts
      </Link>

      {/* Header */}
      <div className="contact-detail-header">
        <div className={`contact-detail-avatar ${isLead ? 'lead' : ''}`}>
          {initials}
        </div>
        <div className="contact-detail-header-info">
          <div className="contact-detail-name">
            {contact.first_name} {contact.last_name}
            <span className={`status-badge ${contact.contact_type.toLowerCase()}`}>
              {contact.contact_type}
            </span>
          </div>
          <div className="contact-detail-meta">
            {contact.email || contact.phone || 'No contact info'}
            {contact.company && ` · ${contact.company.name}`}
          </div>
        </div>
        <div className="contact-detail-header-actions">
          {isLead && (
            <button
              className="btn-primary"
              onClick={async () => {
                const ok = await showConfirm({
                  title: 'Convert to Customer',
                  message: 'Convert this lead to a customer? All data will be preserved.',
                  variant: 'info',
                  confirmLabel: 'Convert',
                });
                if (!ok) return;
                try {
                  const updated = await api.convertLeadToCustomer(contact.id);
                  dispatch({ type: 'UPDATE_CONTACT', payload: updated });
                  setContact(updated);
                } catch (err) {
                  console.error('Conversion failed:', err);
                }
              }}
            >
              <UserCheck size={14} />
              Convert to Customer
            </button>
          )}
          <button className="btn-danger" onClick={handleDelete}>
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="contact-detail-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`contact-detail-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.key);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="contact-detail-tab-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'notes' && renderNotes()}
        {activeTab === 'comms' && renderComms()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'documents' && renderDocuments()}
        {activeTab === 'deals' && <ContactDealsTab contactId={contact.id} />}
      </div>
    </div>
  );
}
