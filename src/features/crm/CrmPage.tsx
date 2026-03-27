import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { useData } from '@/context/DataContext';
import { useAlert } from '@/components/ui/AlertDialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TagInput } from '@/components/ui/TagInput';
import * as api from '@/lib/api';
import type { Contact, ContactInsert, ContactType, Tag } from '@/types/database';
import {
  Users,
  Search,
  UserPlus,
  Pencil,
  Trash2,
  X,
  Building2,
  ChevronUp,
  ChevronDown,
  Tags,
} from 'lucide-react';
import './CrmPage.css';

type SortColumn = 'name' | 'email' | 'phone' | 'type' | 'company' | 'source' | 'status';
type SortDir = 'asc' | 'desc';

const contactTypes: { label: string; value: ContactType | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'Customers', value: 'Customer' },
  { label: 'Leads', value: 'Lead' },
];

const emptyForm: ContactInsert = {
  first_name: '',
  last_name: '',
  email: null,
  phone: null,
  company_id: null,
  notes: null,
  contact_type: 'Customer',
  source: null,
  message: null,
  status: null,
  unsubscribed: false,
};

export function CrmPage() {
  const { state, dispatch } = useData();
  const navigate = useNavigate();
  const { showConfirm } = useAlert();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ContactType | 'All'>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<ContactInsert>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tagModalOpen, setTagModalOpen] = useState(false);

  // Filter and sort contacts
  const filtered = useMemo(() => {
    let list = state.contacts;

    // Filter by type
    if (activeTab !== 'All') {
      list = list.filter((c) => c.contact_type === activeTab);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.first_name.toLowerCase().includes(q) ||
          c.last_name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.company?.name && c.company.name.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortColumn) {
      const dir = sortDir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        let aVal = '';
        let bVal = '';
        switch (sortColumn) {
          case 'name':
            aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
            bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
            break;
          case 'email':
            aVal = (a.email || '').toLowerCase();
            bVal = (b.email || '').toLowerCase();
            break;
          case 'phone':
            aVal = (a.phone || '').toLowerCase();
            bVal = (b.phone || '').toLowerCase();
            break;
          case 'type':
            aVal = (a.contact_type || '').toLowerCase();
            bVal = (b.contact_type || '').toLowerCase();
            break;
          case 'company':
            aVal = (a.company?.name || '').toLowerCase();
            bVal = (b.company?.name || '').toLowerCase();
            break;
          case 'source':
            aVal = (a.source || '').toLowerCase();
            bVal = (b.source || '').toLowerCase();
            break;
          case 'status':
            aVal = (a.status || '').toLowerCase();
            bVal = (b.status || '').toLowerCase();
            break;
        }
        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
        return 0;
      });
    }

    return list;
  }, [state.contacts, search, activeTab, sortColumn, sortDir]);

  const handleSort = useCallback((col: SortColumn, dir: SortDir) => {
    // If clicking the already-active arrow, clear the sort
    if (sortColumn === col && sortDir === dir) {
      setSortColumn(null);
      setSortDir('asc');
    } else {
      setSortColumn(col);
      setSortDir(dir);
    }
  }, [sortColumn, sortDir]);

  const SortHeader = ({ col, label }: { col: SortColumn; label: string }) => (
    <th className="sortable-th">
      {label}
      <span className="sort-arrows">
        <button
          className={`sort-arrow-btn ${sortColumn === col && sortDir === 'asc' ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); handleSort(col, 'asc'); }}
          title={`Sort ${label} ascending`}
        >
          <ChevronUp size={12} />
        </button>
        <button
          className={`sort-arrow-btn ${sortColumn === col && sortDir === 'desc' ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); handleSort(col, 'desc'); }}
          title={`Sort ${label} descending`}
        >
          <ChevronDown size={12} />
        </button>
      </span>
    </th>
  );

  const openNewModal = (type: ContactType = 'Customer') => {
    setEditingContact(null);
    setForm({ ...emptyForm, contact_type: type });
    setModalOpen(true);
  };


  const closeModal = () => {
    setModalOpen(false);
    setEditingContact(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) return;

    setSaving(true);
    try {
      if (editingContact) {
        const updated = await api.updateContact(editingContact.id, form);
        dispatch({ type: 'UPDATE_CONTACT', payload: updated });
      } else {
        const created = await api.createContact(form);
        dispatch({ type: 'ADD_CONTACT', payload: created });
      }
      closeModal();
    } catch (err) {
      console.error('Failed to save contact:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await showConfirm({
      title: 'Delete Contact',
      message: 'Are you sure you want to delete this contact?',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await api.deleteContact(id);
      dispatch({ type: 'DELETE_CONTACT', payload: id });
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  // ── Multi-select helpers ──
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  // ── Tag handlers for bulk modal ──
  const handleBulkAddTag = async (tagId: string) => {
    const ids = Array.from(selectedIds);
    try {
      await api.addTagToContacts(tagId, ids);
      // Refresh contacts from server to get updated tags
      const contacts = await api.fetchContacts();
      dispatch({ type: 'SET_CONTACTS', payload: contacts });
    } catch (err) {
      console.error('Failed to bulk add tag:', err);
    }
  };

  const handleCreateTag = async (name: string): Promise<Tag> => {
    const tag = await api.createTag(name);
    dispatch({ type: 'ADD_TAG', payload: tag });
    return tag;
  };

  if (state.loading) {
    return (
      <PageShell title="Contacts" subtitle="Manage your customers and leads in one place.">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading contacts…</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Contacts"
      subtitle="Manage your customers and leads in one place."
      actions={
        <div className="crm-actions">
          <div className="crm-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => openNewModal(activeTab === 'Lead' ? 'Lead' : 'Customer')}>
            <UserPlus size={16} />
            {activeTab === 'Lead' ? 'Add Lead' : 'Add Contact'}
          </button>
        </div>
      }
    >
      {/* Filter Tabs */}
      <div className="crm-tabs">
        {contactTypes.map((tab) => (
          <button
            key={tab.value}
            className={`crm-tab ${activeTab === tab.value ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
            <span className="crm-tab-count">
              {tab.value === 'All'
                ? state.contacts.length
                : state.contacts.filter((c) => c.contact_type === tab.value).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="data-table-empty">
          <Users size={48} />
          <h3>{search ? 'No matching contacts' : 'No contacts yet'}</h3>
          <p>
            {search
              ? 'Try a different search term.'
              : activeTab === 'Lead'
              ? 'Website enquiries will appear here.'
              : 'Add your first contact to get started.'}
          </p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                </th>
                <SortHeader col="name" label="Name" />
                <SortHeader col="email" label="Email" />
                <SortHeader col="phone" label="Phone" />
                {activeTab === 'All' && <SortHeader col="type" label="Type" />}
                {activeTab !== 'Lead' && <SortHeader col="company" label="Company" />}
                {activeTab === 'Lead' && <SortHeader col="source" label="Source" />}
                {activeTab === 'Lead' && <SortHeader col="status" label="Status" />}
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr
                  key={contact.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/crm/${contact.id}`)}
                  className={selectedIds.has(contact.id) ? 'selected-row' : ''}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(contact.id)}
                      onChange={() => toggleSelect(contact.id)}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                  </td>
                  <td>
                    <div className="name-primary">
                      {contact.first_name} {contact.last_name}
                    </div>
                    {activeTab === 'Lead' && contact.message && (
                      <div
                        className="name-secondary"
                        style={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {contact.message}
                      </div>
                    )}
                    {(contact.tags?.length ?? 0) > 0 && (
                      <div className="contact-row-tags">
                        {contact.tags!.slice(0, 3).map(t => (
                          <span key={t.id} className="tag-pill">{t.name}</span>
                        ))}
                        {contact.tags!.length > 3 && (
                          <span className="tag-pill" style={{ opacity: 0.6 }}>+{contact.tags!.length - 3}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>{contact.email || '—'}</td>
                  <td>{contact.phone || '—'}</td>
                  {activeTab === 'All' && (
                    <td>
                      <span className={`status-badge ${contact.contact_type?.toLowerCase()}`}>
                        {contact.contact_type}
                      </span>
                    </td>
                  )}
                  {activeTab !== 'Lead' && (
                    <td>
                      {contact.company ? (
                        <span className="name-primary">
                          <Building2
                            size={12}
                            style={{ marginRight: 4, verticalAlign: -1 }}
                          />
                          {contact.company.name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                  {activeTab === 'Lead' && (
                    <td>{contact.source || '—'}</td>
                  )}
                  {activeTab === 'Lead' && (
                    <td>
                      {contact.status ? (
                        <span className={`status-badge`}>
                          {contact.status}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                  <td>
                    <div className="row-actions">
                      <button
                        className="row-action-btn"
                        title="View"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/crm/${contact.id}`);
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="row-action-btn danger"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(contact.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="crm-bulk-bar">
          <span>{selectedIds.size} contact{selectedIds.size !== 1 ? 's' : ''} selected</span>
          <button className="btn-primary" onClick={() => setTagModalOpen(true)}>
            <Tags size={14} /> Add Tags
          </button>
          <button className="btn-secondary" onClick={() => setSelectedIds(new Set())}>
            <X size={14} /> Clear
          </button>
        </div>
      )}

      {/* Bulk Tag Modal */}
      {tagModalOpen && (
        <div className="modal-overlay" onClick={() => setTagModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>Add Tags to {selectedIds.size} Contact{selectedIds.size !== 1 ? 's' : ''}</h2>
              <button className="modal-close" onClick={() => setTagModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                Search for an existing tag or type a new name to create one. Tags will be added to all selected contacts.
              </p>
              <TagInput
                assignedTags={[]}
                allTags={state.tags}
                onAdd={handleBulkAddTag}
                onRemove={() => {}}
                onCreate={handleCreateTag}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setTagModalOpen(false); setSelectedIds(new Set()); }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingContact
                  ? 'Edit Contact'
                  : form.contact_type === 'Lead'
                  ? 'New Lead'
                  : 'New Contact'}
              </h2>
              <button className="modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Type selector */}
                <div className="form-group">
                  <label>Type</label>
                  <div className="crm-type-toggle">
                    <button
                      type="button"
                      className={`crm-type-btn ${form.contact_type === 'Customer' ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, contact_type: 'Customer' })}
                    >
                      Customer
                    </button>
                    <button
                      type="button"
                      className={`crm-type-btn ${form.contact_type === 'Lead' ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, contact_type: 'Lead' })}
                    >
                      Lead
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      className="form-input"
                      value={form.first_name}
                      onChange={(e) =>
                        setForm({ ...form, first_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      className="form-input"
                      value={form.last_name}
                      onChange={(e) =>
                        setForm({ ...form, last_name: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      className="form-input"
                      type="email"
                      value={form.email ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          email: e.target.value || null,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      className="form-input"
                      value={form.phone ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          phone: e.target.value || null,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Customer-specific fields */}
                {form.contact_type === 'Customer' && (
                  <div className="form-group">
                    <label>Company</label>
                    <SearchableSelect
                      className="form-select"
                      value={form.company_id ?? ''}
                      onChange={(val) =>
                        setForm({
                          ...form,
                          company_id: val || null,
                        })
                      }
                      options={state.companies.map((company) => ({ label: company.name, value: company.id }))}
                      placeholder="No company"
                    />
                  </div>
                )}

                {/* Lead-specific fields */}
                {form.contact_type === 'Lead' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Source</label>
                        <select
                          className="form-select"
                          value={form.source ?? ''}
                          onChange={(e) =>
                            setForm({ ...form, source: e.target.value || null })
                          }
                        >
                          <option value="">Select source</option>
                          {state.leadSources.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Status</label>
                        <select
                          className="form-select"
                          value={form.status ?? ''}
                          onChange={(e) =>
                            setForm({ ...form, status: e.target.value || null })
                          }
                        >
                          <option value="">Select status</option>
                          {state.leadStatuses.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Message</label>
                      <textarea
                        className="form-textarea"
                        value={form.message ?? ''}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            message: e.target.value || null,
                          })
                        }
                        placeholder="Enquiry message or notes..."
                        rows={3}
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    className="form-textarea"
                    value={form.notes ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        notes: e.target.value || null,
                      })
                    }
                    placeholder="Any notes about this contact..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingContact
                    ? 'Update Contact'
                    : form.contact_type === 'Lead'
                    ? 'Create Lead'
                    : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
