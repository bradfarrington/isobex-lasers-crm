import { useState, useEffect, useRef, useCallback } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { useAlert } from '@/components/ui/AlertDialog';
import * as api from '@/lib/api';
import type { DocumentCategory, CrmDocument } from '@/types/database';
import {
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Upload,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Download,
  Loader2,
} from 'lucide-react';
import './DocumentsPage.css';

/* ─── helpers ─── */

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(fileType: string | null) {
  if (!fileType) return <File size={18} />;
  if (fileType.startsWith('image/')) return <FileImage size={18} />;
  if (fileType.includes('spreadsheet') || fileType.includes('csv') || fileType.includes('excel'))
    return <FileSpreadsheet size={18} />;
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text'))
    return <FileText size={18} />;
  return <File size={18} />;
}

export function DocumentsPage() {
  const { showAlert, showConfirm } = useAlert();

  /* ─── state ─── */
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<CrmDocument[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Category add/edit
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── load categories ─── */
  const loadCategories = useCallback(async () => {
    try {
      const cats = await api.fetchDocumentCategories();
      setCategories(cats);
      return cats;
    } catch (err) {
      console.error('Failed to load categories:', err);
      return [];
    }
  }, []);

  /* ─── load documents for selected category ─── */
  const loadDocuments = useCallback(async (catId: string | null) => {
    if (!catId) {
      setDocuments([]);
      return;
    }
    try {
      const docs = await api.fetchCrmDocuments(catId);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, []);

  /* ─── initial load ─── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const cats = await loadCategories();
      if (cats.length > 0) {
        setSelectedCatId(cats[0].id);
        await loadDocuments(cats[0].id);
      }
      setLoading(false);
    })();
  }, [loadCategories, loadDocuments]);

  /* ─── select category ─── */
  const selectCategory = async (catId: string) => {
    setSelectedCatId(catId);
    await loadDocuments(catId);
  };

  /* ─── category CRUD ─── */
  const handleAddCategory = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const cat = await api.createDocumentCategory({
        name: newName.trim(),
        sort_order: categories.length,
      });
      setCategories((prev) => [...prev, cat]);
      setSelectedCatId(cat.id);
      setDocuments([]);
      setNewName('');
      setShowAdd(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Unknown error';
      if (message.includes('duplicate') || message.includes('unique')) {
        showAlert({
          title: 'Duplicate Name',
          message: `"${newName.trim()}" already exists.`,
          variant: 'warning',
        });
      } else {
        showAlert({ title: 'Error', message, variant: 'danger' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditCategory = async (id: string) => {
    if (!editName.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await api.updateDocumentCategory(id, { name: editName.trim() });
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
    } catch (err) {
      console.error('Failed to rename category:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const ok = await showConfirm({
      title: 'Delete Category',
      message: 'This will delete the category and all its documents. Continue?',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await api.deleteDocumentCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (selectedCatId === id) {
        const remaining = categories.filter((c) => c.id !== id);
        if (remaining.length > 0) {
          setSelectedCatId(remaining[0].id);
          await loadDocuments(remaining[0].id);
        } else {
          setSelectedCatId(null);
          setDocuments([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const startEdit = (cat: DocumentCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  /* ─── file upload ─── */
  const handleFiles = async (files: FileList | File[]) => {
    if (!selectedCatId || uploading) return;
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    setUploading(true);
    try {
      const uploaded = await api.uploadCrmDocuments(selectedCatId, fileArr);
      setDocuments((prev) => [...uploaded, ...prev]);
    } catch (err) {
      console.error('Upload failed:', err);
      showAlert({ title: 'Upload Failed', message: 'Could not upload file(s). Please try again.', variant: 'danger' });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  /* ─── file actions ─── */
  const handleDownload = (doc: CrmDocument) => {
    const url = api.getCrmDocumentPublicUrl(doc.storage_path);
    window.open(url, '_blank');
  };

  const handleDeleteDocument = async (doc: CrmDocument) => {
    const ok = await showConfirm({
      title: 'Delete Document',
      message: `Delete "${doc.file_name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await api.deleteCrmDocument(doc);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  /* ─── derived ─── */
  const selectedCat = categories.find((c) => c.id === selectedCatId);

  // document counts per category
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      const counts: Record<string, number> = {};
      for (const cat of categories) {
        try {
          const docs = await api.fetchCrmDocuments(cat.id);
          counts[cat.id] = docs.length;
        } catch {
          counts[cat.id] = 0;
        }
      }
      setDocCounts(counts);
    })();
  }, [categories, documents]); // re-count when documents change

  /* ─── render ─── */
  if (loading) {
    return (
      <PageShell title="Documents" subtitle="Manage installation guides, manuals, and support documentation.">
        <div className="loading-container">
          <div className="loading-spinner" />
          <span>Loading…</span>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Documents"
      subtitle="Manage installation guides, manuals, and support documentation."
    >
      <div className="docs-layout">
        {/* ── Sidebar ── */}
        <div className="docs-sidebar">
          <div className="docs-sidebar-header">
            <h3>Categories</h3>
            <button onClick={() => setShowAdd(!showAdd)}>
              <Plus size={12} />
              Add
            </button>
          </div>

          {categories.length === 0 && !showAdd ? (
            <div className="docs-sidebar-empty">
              No categories yet.
              <br />
              Click "Add" to create one.
            </div>
          ) : (
            <ul className="docs-sidebar-list">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className={`docs-sidebar-item${cat.id === selectedCatId ? ' active' : ''}${editingId === cat.id ? ' editing' : ''}`}
                  onClick={() => {
                    if (editingId !== cat.id) selectCategory(cat.id);
                  }}
                >
                  {editingId === cat.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditCategory(cat.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                      <div className="row-actions" style={{ marginLeft: 4 }}>
                        <button
                          className="row-action-btn"
                          title="Save"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCategory(cat.id);
                          }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="row-action-btn"
                          title="Cancel"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <FolderOpen size={16} className="docs-sidebar-item-icon" />
                      <span className="docs-sidebar-item-name">{cat.name}</span>
                      <span className="docs-sidebar-item-count">{docCounts[cat.id] ?? '…'}</span>
                      <div className="docs-sidebar-item-actions">
                        <button
                          className="row-action-btn"
                          title="Rename"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(cat);
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="row-action-btn danger"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat.id);
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {showAdd && (
            <div className="docs-sidebar-add">
              <input
                type="text"
                placeholder="Category name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCategory();
                  if (e.key === 'Escape') setShowAdd(false);
                }}
                autoFocus
              />
              <button onClick={handleAddCategory} disabled={!newName.trim() || saving}>
                <Check size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ── Main ── */}
        <div className="docs-main">
          {!selectedCat ? (
            <div className="docs-empty">
              <FolderOpen size={48} />
              <h3>No Category Selected</h3>
              <p>Create a category from the sidebar, then upload documents into it.</p>
            </div>
          ) : (
            <>
              <div className="docs-main-header">
                <h2>{selectedCat.name}</h2>
              </div>

              {/* Upload zone */}
              <div
                className={`docs-upload-zone${dragging ? ' dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <Upload size={16} className="docs-upload-zone-icon" />
                <p>
                  <strong>Click to upload</strong> or drag and drop files here
                </p>
                <p className="upload-hint">PDF, images, spreadsheets, or any file type</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>

              {uploading && (
                <div className="docs-uploading">
                  <Loader2 size={16} className="loading-spinner" style={{ marginBottom: 0, width: 16, height: 16, borderWidth: 2 }} />
                  Uploading…
                </div>
              )}

              {/* File table */}
              {documents.length === 0 ? (
                <div className="docs-empty">
                  <FileText size={40} />
                  <h3>No Documents Yet</h3>
                  <p>Upload files above to add documents to this category.</p>
                </div>
              ) : (
                <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <table className="docs-file-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Size</th>
                        <th>Uploaded</th>
                        <th style={{ width: 80 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td>
                            <div className="docs-file-name">
                              <span className="docs-file-icon">{fileIcon(doc.file_type)}</span>
                              <span className="docs-file-name-text">{doc.file_name}</span>
                            </div>
                          </td>
                          <td>{formatFileSize(doc.file_size)}</td>
                          <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                          <td>
                            <div className="docs-file-actions">
                              <button
                                className="row-action-btn"
                                title="Download"
                                onClick={() => handleDownload(doc)}
                              >
                                <Download size={14} />
                              </button>
                              <button
                                className="row-action-btn danger"
                                title="Delete"
                                onClick={() => handleDeleteDocument(doc)}
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
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
