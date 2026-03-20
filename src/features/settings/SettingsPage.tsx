import { useState } from 'react';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { PageShell } from '@/components/layout/PageShell';
import { useData } from '@/context/DataContext';
import * as api from '@/lib/api';
import type { LookupItem } from '@/types/database';
import { useAlert } from '@/components/ui/AlertDialog';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import './SettingsPage.css';

type LookupTable = 'lead_sources' | 'lead_statuses' | 'company_statuses' | 'product_labels';
type CollectionKey = 'leadSources' | 'leadStatuses' | 'companyStatuses' | 'productLabels';

interface LookupCardProps {
  title: string;
  table: LookupTable;
  collection: CollectionKey;
  items: LookupItem[];
  hasColor?: boolean;
}

function LookupCard({ title, table, collection, items, hasColor }: LookupCardProps) {
  const { dispatch } = useData();
  const { showAlert, showConfirm } = useAlert();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#6b7280');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const item = await api.createLookupItem(table, {
        name: newName.trim(),
        ...(hasColor ? { color: newColor } : {}),
        sort_order: items.length,
      });
      dispatch({ type: 'ADD_LOOKUP', collection, payload: item });
      setNewName('');
      setNewColor('#6b7280');
      setShowAdd(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Unknown error';
      if (message.includes('duplicate') || message.includes('unique')) {
        showAlert({ title: 'Duplicate Name', message: `"${newName.trim()}" already exists. Please use a different name.`, variant: 'warning' });
      } else {
        showAlert({ title: 'Error', message: `Failed to add item: ${message}`, variant: 'danger' });
      }
      console.error('Failed to add item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await api.updateLookupItem(table, id, {
        name: editName.trim(),
        ...(hasColor ? { color: editColor } : {}),
      });
      dispatch({ type: 'UPDATE_LOOKUP', collection, payload: updated });
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await showConfirm({
      title: 'Delete Item',
      message: 'Delete this item? It will no longer appear in dropdown lists.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await api.deleteLookupItem(table, id);
      dispatch({ type: 'DELETE_LOOKUP', collection, payload: id });
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const startEdit = (item: LookupItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditColor(item.color || '#6b7280');
  };

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <h3>{title}</h3>
        <button onClick={() => setShowAdd(!showAdd)}>
          <Plus size={12} />
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <div className="settings-list-empty">No items yet. Click "Add" above.</div>
      ) : (
        <ul className="settings-list">
          {items.map((item) => (
            <li key={item.id} className="settings-list-item">
              {editingId === item.id ? (
                <>
                  {hasColor && (
                    <ColorPicker
                      value={editColor}
                      onChange={setEditColor}
                    />
                  )}
                  <input
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEdit(item.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    style={{ flex: 1, padding: '4px 8px', fontSize: 'var(--font-size-sm)' }}
                  />
                  <div className="row-actions" style={{ marginLeft: 8 }}>
                    <button
                      className="row-action-btn"
                      title="Save"
                      onClick={() => handleEdit(item.id)}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      className="row-action-btn"
                      title="Cancel"
                      onClick={() => setEditingId(null)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {hasColor && (
                    <div
                      className="settings-list-item-color"
                      style={{ backgroundColor: item.color || '#6b7280' }}
                    />
                  )}
                  <span className="settings-list-item-name">{item.name}</span>
                  <div className="settings-list-item-actions">
                    <button
                      className="row-action-btn"
                      title="Edit"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="row-action-btn danger"
                      title="Delete"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {showAdd && (
        <div className="settings-add-form">
          {hasColor && (
            <ColorPicker
              value={newColor}
              onChange={setNewColor}
            />
          )}
          <input
            type="text"
            placeholder="Enter name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setShowAdd(false);
            }}
            autoFocus
          />
          <button onClick={handleAdd} disabled={!newName.trim() || saving}>
            <Check size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export function SettingsPage() {
  const { state } = useData();

  return (
    <PageShell
      title="Settings"
      subtitle="Configure dropdown lists and system preferences."
    >
      <div className="settings-grid">
        <LookupCard
          title="Lead Sources"
          table="lead_sources"
          collection="leadSources"
          items={state.leadSources}
        />
        <LookupCard
          title="Lead Statuses"
          table="lead_statuses"
          collection="leadStatuses"
          items={state.leadStatuses}
          hasColor
        />
        <LookupCard
          title="Company Statuses"
          table="company_statuses"
          collection="companyStatuses"
          items={state.companyStatuses}
          hasColor
        />
        <LookupCard
          title="Product Labels"
          table="product_labels"
          collection="productLabels"
          items={state.productLabels}
          hasColor
        />
      </div>
    </PageShell>
  );
}
