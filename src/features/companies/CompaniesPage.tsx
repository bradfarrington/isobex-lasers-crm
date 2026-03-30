import { useState, useMemo, useCallback } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { useData } from '@/context/DataContext';
import { useAlert } from '@/components/ui/AlertDialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import * as api from '@/lib/api';
import { getFullAddress } from '@/lib/address';
import type { Company, CompanyInsert } from '@/types/database';
import {
  Building2,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Globe,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import '../crm/CrmPage.css';
import { useIsMobile } from '@/hooks/useIsMobile';

type SortColumn = 'name' | 'industry' | 'phone' | 'website' | 'status';
type SortDir = 'asc' | 'desc';

const emptyForm: CompanyInsert = {
  name: '',
  industry: null,
  website: null,
  phone: null,
  address_line_1: null,
  address_line_2: null,
  city: null,
  county: null,
  postcode: null,
  country: null,
  notes: null,
  status: '',
};

export function CompaniesPage() {
  const { state, dispatch } = useData();
  const { showConfirm } = useAlert();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyInsert>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const isMobile = useIsMobile();
  const [modalStep, setModalStep] = useState(1);

  const filtered = useMemo(() => {
    let list = state.companies;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.industry && c.industry.toLowerCase().includes(q)) ||
          getFullAddress(c).toLowerCase().includes(q)
      );
    }

    if (sortColumn) {
      const dir = sortDir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        let aVal = '';
        let bVal = '';
        switch (sortColumn) {
          case 'name':
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case 'industry':
            aVal = (a.industry || '').toLowerCase();
            bVal = (b.industry || '').toLowerCase();
            break;
          case 'phone':
            aVal = (a.phone || '').toLowerCase();
            bVal = (b.phone || '').toLowerCase();
            break;
          case 'website':
            aVal = (a.website || '').toLowerCase();
            bVal = (b.website || '').toLowerCase();
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
  }, [state.companies, search, sortColumn, sortDir]);

  const handleSort = useCallback((col: SortColumn, dir: SortDir) => {
    if (sortColumn === col && sortDir === dir) {
      setSortColumn(null);
      setSortDir('asc');
    } else {
      setSortColumn(col);
      setSortDir(dir);
    }
  }, [sortColumn, sortDir]);

  const handleRowClick = (id: string) => {
    if (window.innerWidth <= 768) {
      setExpandedCards(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    }
  };

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

  const openNewModal = () => {
    setEditingCompany(null);
    setForm(emptyForm);
    setModalStep(1);
    setModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setForm({
      name: company.name,
      industry: company.industry,
      website: company.website,
      phone: company.phone,
      address_line_1: company.address_line_1,
      address_line_2: company.address_line_2,
      city: company.city,
      county: company.county,
      postcode: company.postcode,
      country: company.country,
      notes: company.notes,
      status: company.status || '',
    });
    setModalStep(1);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCompany(null);
    setForm(emptyForm);
    setModalStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    try {
      if (editingCompany) {
        const updated = await api.updateCompany(editingCompany.id, form);
        dispatch({ type: 'UPDATE_COMPANY', payload: updated });
      } else {
        const created = await api.createCompany(form);
        dispatch({ type: 'ADD_COMPANY', payload: created });
      }
      closeModal();
    } catch (err) {
      console.error('Failed to save company:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await showConfirm({
      title: 'Delete Company',
      message: 'Are you sure you want to delete this company?',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await api.deleteCompany(id);
      dispatch({ type: 'DELETE_COMPANY', payload: id });
    } catch (err) {
      console.error('Failed to delete company:', err);
    }
  };

  if (state.loading) {
    return (
      <PageShell title="Companies" subtitle="Manage business accounts and company records.">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading companies…</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Companies"
      subtitle="Manage business accounts and company records."
      actions={
        <div className="crm-actions">
          <div className="crm-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={openNewModal}>
            <Plus size={16} />
            <span className="btn-text-mobile-hide">Add Company</span>
          </button>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <div className="data-table-empty">
          <Building2 size={48} />
          <h3>{search ? 'No matching companies' : 'No companies yet'}</h3>
          <p>
            {search
              ? 'Try a different search term.'
              : 'Add your first company to get started.'}
          </p>
        </div>
      ) : (
        <div className="data-table-wrapper responsive-wrapper">
          <table className="data-table crm-table-responsive">
            <thead>
              <tr>
                <SortHeader col="name" label="Company" />
                <SortHeader col="industry" label="Industry" />
                <SortHeader col="phone" label="Phone" />
                <SortHeader col="website" label="Website" />
                <SortHeader col="status" label="Status" />
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((company) => (
                <tr 
                  key={company.id}
                  style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                  onClick={() => handleRowClick(company.id)}
                  className={expandedCards.has(company.id) ? 'expanded' : 'collapsed'}
                >
                  <td className="col-name no-indent">
                    <div className="name-primary" style={{ display: 'flex', alignItems: 'center' }}>
                      <Building2 size={12} style={{ marginRight: 4, flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{company.name}</span>
                    </div>
                    {getFullAddress(company) && (
                      <div className="name-secondary">{getFullAddress(company)}</div>
                    )}
                  </td>
                  <td data-label="Industry" className="mobile-secondary-detail">{company.industry || '—'}</td>
                  <td data-label="Phone" className="mobile-secondary-detail">{company.phone || '—'}</td>
                  <td data-label="Website" className="mobile-secondary-detail">
                    {company.website ? (
                      <a
                        href={
                          company.website.startsWith('http')
                            ? company.website
                            : `https://${company.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--color-primary)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe size={12} />
                        {company.website.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td data-label="Status" className="mobile-secondary-detail">
                    <span className={`status-badge ${company.status}`}>
                      {company.status}
                    </span>
                  </td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button
                        className="row-action-btn mobile-expand-toggle"
                        title={expandedCards.has(company.id) ? "Collapse" : "Expand"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCards(prev => {
                            const next = new Set(prev);
                            if (next.has(company.id)) next.delete(company.id); else next.add(company.id);
                            return next;
                          });
                        }}
                      >
                        {expandedCards.has(company.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button
                        className="row-action-btn"
                        title="Edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(company);
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="row-action-btn danger"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(company.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="mobile-only-detail" style={{ padding: 'var(--space-4) 0 0', marginTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)', justifyContent: 'center' }}>
                    <button 
                      className="btn-secondary" 
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={(e) => { e.stopPropagation(); openEditModal(company); }}
                    >
                      Edit Company Details
                    </button>
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
              <h2>{editingCompany ? 'Edit Company' : 'New Company'}</h2>
              {isMobile && <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginLeft: '12px', fontWeight: 500 }}>Step {modalStep} of 2</span>}
              <button className="modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {(!isMobile || modalStep === 1) && (
                  <div className="modal-step-content">
                    <div className="form-group">
                      <label>Company Name *</label>
                      <input
                        className="form-input"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Industry</label>
                        <input
                          className="form-input"
                          value={form.industry ?? ''}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              industry: e.target.value || null,
                            })
                          }
                          placeholder="e.g. Manufacturing"
                        />
                      </div>
                      <div className="form-group">
                        <label>Status</label>
                        <SearchableSelect
                          className="form-select"
                          value={form.status}
                          onChange={(val) =>
                            setForm({
                              ...form,
                              status: val,
                            })
                          }
                          searchable={false}
                          sort={false}
                          options={[
                            { label: 'Select status', value: '' },
                            ...state.companyStatuses.map((s) => ({ label: s.name, value: s.name }))
                          ]}
                        />
                      </div>
                    </div>
                    <div className="form-row">
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
                      <div className="form-group">
                        <label>Website</label>
                        <input
                          className="form-input"
                          value={form.website ?? ''}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              website: e.target.value || null,
                            })
                          }
                          placeholder="www.example.com"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {(!isMobile || modalStep === 2) && (
                  <div className="modal-step-content">
                    <fieldset className="form-fieldset">
                      <legend>Address</legend>
                      <div className="form-group">
                        <label>Address Line 1</label>
                        <input
                          className="form-input"
                          value={form.address_line_1 ?? ''}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              address_line_1: e.target.value || null,
                            })
                          }
                          placeholder="Street address"
                        />
                      </div>
                      <div className="form-group">
                        <label>Address Line 2</label>
                        <input
                          className="form-input"
                          value={form.address_line_2 ?? ''}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              address_line_2: e.target.value || null,
                            })
                          }
                          placeholder="Suite, unit, building (optional)"
                        />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Town / City</label>
                          <input
                            className="form-input"
                            value={form.city ?? ''}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                city: e.target.value || null,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>County</label>
                          <input
                            className="form-input"
                            value={form.county ?? ''}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                county: e.target.value || null,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Postcode</label>
                          <input
                            className="form-input"
                            value={form.postcode ?? ''}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                postcode: e.target.value || null,
                              })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Country</label>
                          <input
                            className="form-input"
                            value={form.country ?? ''}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                country: e.target.value || null,
                              })
                            }
                          />
                        </div>
                      </div>
                    </fieldset>
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
                        placeholder="Any notes about this company..."
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {isMobile ? (
                  <>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ marginRight: 'auto' }}
                      onClick={() => modalStep === 1 ? closeModal() : setModalStep(s => s - 1)}
                    >
                      {modalStep === 1 ? 'Cancel' : 'Back'}
                    </button>
                    {modalStep < 2 ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setModalStep(s => s + 1)}
                        disabled={modalStep === 1 && !form.name.trim()}
                        title={modalStep === 1 && !form.name.trim() ? "Company Name is required" : ""}
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={saving}
                      >
                        {saving
                          ? 'Saving...'
                          : editingCompany
                          ? 'Update Company'
                          : 'Create Company'}
                      </button>
                    )}
                  </>
                ) : (
                  <>
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
                        : editingCompany
                        ? 'Update Company'
                        : 'Create Company'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
