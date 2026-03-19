import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { useData } from '@/context/DataContext';
import { useAlert } from '@/components/ui/AlertDialog';
import * as api from '@/lib/api';
import type { Contact, ContactInsert, ContactType } from '@/types/database';
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
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

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

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setForm({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      company_id: contact.company_id,
      notes: contact.notes,
      contact_type: contact.contact_type,
      source: contact.source,
      message: contact.message,
      status: contact.status,
    });
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
                >
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
                    <select
                      className="form-select"
                      value={form.company_id ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          company_id: e.target.value || null,
                        })
                      }
                    >
                      <option value="">No company</option>
                      {state.companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
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
