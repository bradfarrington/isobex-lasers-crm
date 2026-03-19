import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as api from '@/lib/api';
import { useAlert } from '@/components/ui/AlertDialog';
import type { ContactDocument, DocumentFolder } from '@/types/database';
import {
  Upload,
  FileText,
  Image,
  Film,
  File,
  Pencil,
  Trash2,
  Download,
  Check,
  X,
  FolderOpen,
  Plus,
  ChevronDown,
} from 'lucide-react';
import './ContactDocumentsTab.css';

interface Props {
  contactId: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return <File size={16} />;
  if (fileType.startsWith('image/')) return <Image size={16} />;
  if (fileType.startsWith('video/')) return <Film size={16} />;
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text'))
    return <FileText size={16} />;
  return <File size={16} />;
}

// ── Multi-select folder dropdown ──
function FolderMultiSelect({
  doc,
  allFolderNames,
  onToggle,
}: {
  doc: ContactDocument;
  allFolderNames: string[];
  onToggle: (doc: ContactDocument, folderName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="docs-folder-multi" ref={ref}>
      <button
        className="docs-folder-multi-trigger"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <div className="docs-folder-badges">
          {doc.folders.map((f) => (
            <span key={f} className="docs-folder-badge">{f}</span>
          ))}
        </div>
        <ChevronDown size={12} className={open ? 'chevron-open' : ''} />
      </button>
      {open && (
        <div className="docs-folder-multi-dropdown">
          {allFolderNames.map((name) => {
            const checked = doc.folders.includes(name);
            return (
              <label key={name} className="docs-folder-checkbox-item">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(doc, name)}
                />
                <span>{name}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ContactDocumentsTab({ contactId }: Props) {
  const { showConfirm } = useAlert();
  const [documents, setDocuments] = useState<ContactDocument[]>([]);
  const [savedFolders, setSavedFolders] = useState<DocumentFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // ── Load documents + saved folders ──
  const loadDocs = useCallback(async () => {
    try {
      const [docs, folders] = await Promise.all([
        api.fetchContactDocuments(contactId),
        api.fetchDocumentFolders(),
      ]);
      setDocuments(docs);
      setSavedFolders(folders);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  // ── Derive folder pills (only folders with documents) ──
  const folders = useMemo(() => {
    const folderMap = new Map<string, number>();
    for (const doc of documents) {
      for (const f of doc.folders) {
        folderMap.set(f, (folderMap.get(f) || 0) + 1);
      }
    }
    const entries = Array.from(folderMap.entries());
    entries.sort((a, b) => {
      if (a[0] === 'General') return -1;
      if (b[0] === 'General') return 1;
      return a[0].localeCompare(b[0]);
    });
    return entries;
  }, [documents]);

  // ── All available folders (for multi-select dropdown) ──
  const allFolderNames = useMemo(() => {
    const names = new Set<string>();
    names.add('General');
    for (const doc of documents) {
      for (const f of doc.folders) names.add(f);
    }
    for (const sf of savedFolders) names.add(sf.folder_name);
    const sorted = Array.from(names).sort((a, b) => {
      if (a === 'General') return -1;
      if (b === 'General') return 1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [documents, savedFolders]);

  // ── Filtered docs ──
  const filteredDocs = useMemo(() => {
    if (!activeFolder) return documents;
    return documents.filter((d) => d.folders.includes(activeFolder));
  }, [documents, activeFolder]);

  // ── Upload handler ──
  const handleUpload = async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const folders = activeFolder ? [activeFolder] : ['General'];
      const uploaded = await api.uploadContactDocuments(
        contactId,
        Array.from(files),
        folders
      );
      setDocuments((prev) => [...uploaded, ...prev]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  // ── Drag & drop ──
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items?.length) {
      setDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files?.length) {
      handleUpload(e.dataTransfer.files);
    }
  };

  // ── Rename ──
  const startRename = (doc: ContactDocument) => {
    setRenamingId(doc.id);
    setRenameValue(doc.file_name);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const submitRename = async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      const updated = await api.renameContactDocument(renamingId, renameValue.trim());
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) {
      console.error('Rename failed:', err);
    }
    setRenamingId(null);
  };

  // ── Delete ──
  const handleDelete = async (doc: ContactDocument) => {
    const ok = await showConfirm({
      title: 'Delete File',
      message: `Delete "${doc.file_name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await api.deleteContactDocument(doc);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // ── Toggle folder on a document ──
  const handleToggleFolder = async (doc: ContactDocument, folderName: string) => {
    const has = doc.folders.includes(folderName);
    let newFolders: string[];
    if (has) {
      // Don't allow removing the last folder
      if (doc.folders.length <= 1) return;
      newFolders = doc.folders.filter((f) => f !== folderName);
    } else {
      newFolders = [...doc.folders, folderName];
    }
    try {
      const updated = await api.updateDocumentFolders(doc.id, newFolders);
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) {
      console.error('Folder toggle failed:', err);
    }
  };

  // ── New folder ──
  const submitNewFolder = async () => {
    const trimmed = newFolderName.trim();
    if (
      !trimmed ||
      allFolderNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())
    ) {
      setCreatingFolder(false);
      setNewFolderName('');
      return;
    }
    try {
      const created = await api.createDocumentFolder(trimmed);
      setSavedFolders((prev) => [...prev, created]);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
    setCreatingFolder(false);
    setNewFolderName('');
  };

  // ── Download ──
  const handleDownload = (doc: ContactDocument) => {
    const url = api.getDocumentPublicUrl(doc.storage_path);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="contact-detail-grid single-column">
        <div className="contact-detail-card full-width">
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
            <div className="loading-spinner" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-detail-grid single-column">
      <div className="contact-detail-card full-width">
        {/* Upload zone */}
        <div
          className={`docs-upload-zone ${dragging ? 'dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="docs-upload-zone-icon">
            <Upload size={22} />
          </div>
          <h4>Drop files here or click to upload</h4>
          <p>Upload multiple files at once — PDF, images, documents, and more</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => {
              if (e.target.files) handleUpload(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {/* Uploading indicator */}
        {uploading && (
          <div className="docs-uploading-overlay">
            <div className="loading-spinner" />
            <span>Uploading files…</span>
          </div>
        )}

        {/* Folder filter pills + new folder */}
        {(folders.length > 0 || savedFolders.length > 0) && (
          <div className="docs-toolbar">
            <div className="docs-folder-pills">
              <button
                className={`docs-folder-pill ${activeFolder === null ? 'active' : ''}`}
                onClick={() => setActiveFolder(null)}
              >
                All
                <span className="pill-count">{documents.length}</span>
              </button>
              {folders.map(([name, count]) => (
                <button
                  key={name}
                  className={`docs-folder-pill ${activeFolder === name ? 'active' : ''}`}
                  onClick={() => setActiveFolder(name)}
                >
                  {name}
                  <span className="pill-count">{count}</span>
                </button>
              ))}
              {creatingFolder ? (
                <div className="docs-new-folder-inline">
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitNewFolder();
                      if (e.key === 'Escape') {
                        setCreatingFolder(false);
                        setNewFolderName('');
                      }
                    }}
                  />
                  <button className="nf-confirm" onClick={submitNewFolder}>
                    <Check size={12} />
                  </button>
                  <button
                    className="nf-cancel"
                    onClick={() => {
                      setCreatingFolder(false);
                      setNewFolderName('');
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  className="docs-new-folder-btn"
                  onClick={() => setCreatingFolder(true)}
                >
                  <Plus size={12} />
                  New Folder
                </button>
              )}
            </div>
          </div>
        )}

        {/* File list */}
        {filteredDocs.length === 0 ? (
          <div className="docs-empty">
            <FolderOpen size={36} />
            <h4>
              {documents.length === 0
                ? 'No documents yet'
                : `No documents in "${activeFolder}"`}
            </h4>
            <p>
              {documents.length === 0
                ? 'Upload your first file using the area above.'
                : 'Upload a file or move existing documents to this folder.'}
            </p>
          </div>
        ) : (
          <table className="docs-file-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Folders</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className="docs-file-name-cell">
                      <div className="docs-file-icon">{getFileIcon(doc.file_type)}</div>
                      <div>
                        {renamingId === doc.id ? (
                          <input
                            ref={renameInputRef}
                            className="docs-rename-input"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitRename();
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            onBlur={submitRename}
                          />
                        ) : (
                          <>
                            <div className="docs-file-name">{doc.file_name}</div>
                            <div className="docs-file-type">
                              {doc.file_type?.split('/').pop()?.toUpperCase() || 'FILE'}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <FolderMultiSelect
                      doc={doc}
                      allFolderNames={allFolderNames}
                      onToggle={handleToggleFolder}
                    />
                  </td>
                  <td>{formatFileSize(doc.file_size)}</td>
                  <td>
                    {new Date(doc.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td>
                    <div className="docs-row-actions">
                      <button
                        className="docs-action-btn"
                        title="Download"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download size={14} />
                      </button>
                      <button
                        className="docs-action-btn"
                        title="Rename"
                        onClick={() => startRename(doc)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="docs-action-btn danger"
                        title="Delete"
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
