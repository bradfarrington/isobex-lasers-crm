import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { DatePicker } from '@/components/ui/DatePicker';
import { useAlert } from '@/components/ui/AlertDialog';
import { useData } from '@/context/DataContext';
import * as api from '@/lib/api';
import type {
  Pipeline,
  PipelineStage,
  PipelineDeal,
  PipelineCardField,
  PipelineFieldConfig,
  Contact,
} from '@/types/database';
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Building2,
  User,
  Settings2,
  Calendar,
  FileText,
  GripVertical,
} from 'lucide-react';
import './PipelinePage.css';

const STAGE_COLORS = [
  '#6b7280', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f59e0b', '#10b981', '#ef4444', '#06b6d4',
];

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
};

export function PipelinePage() {
  const { state } = useData();
  const { showAlert, showConfirm } = useAlert();

  // ── Pipeline list state ──
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Pipeline CRUD inline state ──
  const [renamingPipeline, setRenamingPipeline] = useState(false);
  const [renamePipelineName, setRenamePipelineName] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Create Pipeline Modal ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [allFields, setAllFields] = useState<PipelineCardField[]>([]);
  const [createFieldSelections, setCreateFieldSelections] = useState<
    Record<string, boolean>
  >({});

  // ── Stage state ──
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);

  // ── Add stage form ──
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState(STAGE_COLORS[1]);

  // ── Edit stage inline ──
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editStageColor, setEditStageColor] = useState('#6b7280');

  // ── Deal state ──
  const [deals, setDeals] = useState<PipelineDeal[]>([]);

  // ── Deal Modal (add + edit) ──
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [dealModalStageId, setDealModalStageId] = useState<string | null>(null);
  const [dealModalContactId, setDealModalContactId] = useState('');
  const [dealModalContactSearch, setDealModalContactSearch] = useState('');
  const [dealModalFieldData, setDealModalFieldData] = useState<
    Record<string, any>
  >({});

  // ── Drag and Drop ──
  const [dragDealId, setDragDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // ── Field config ──
  const [fieldConfigs, setFieldConfigs] = useState<PipelineFieldConfig[]>([]);
  const [showFieldConfig, setShowFieldConfig] = useState(false);

  // ── Derived: enabled fields for current pipeline ──
  const enabledFields = useMemo(
    () =>
      fieldConfigs
        .filter((fc) => fc.enabled && fc.field)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((fc) => fc.field!),
    [fieldConfigs]
  );

  // ══════════════════════════════════════════
  //  DATA LOADING
  // ══════════════════════════════════════════

  const loadPipelines = useCallback(async () => {
    try {
      const data = await api.fetchPipelines();
      setPipelines(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load pipelines:', err);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  // Load card field definitions (for create modal & config panel)
  useEffect(() => {
    api
      .fetchPipelineCardFields()
      .then((fields) => {
        setAllFields(fields);
        // Pre-check defaults for create modal
        const selections: Record<string, boolean> = {};
        fields.forEach((f) => {
          selections[f.id] = f.is_default;
        });
        setCreateFieldSelections(selections);
      })
      .catch((err) => console.error('Failed to load card fields:', err));
  }, []);

  // Load stages + deals + field config when pipeline changes
  const loadStages = useCallback(async (pipelineId: string) => {
    setStagesLoading(true);
    try {
      const stData = await api.fetchPipelineStages(pipelineId);
      setStages(stData);
      try {
        const stageIds = stData.map((s) => s.id);
        const dlData = await api.fetchPipelineDeals(stageIds);
        setDeals(dlData);
      } catch (dealErr) {
        console.error('Failed to load deals:', dealErr);
        setDeals([]);
      }
      try {
        let configs = await api.fetchPipelineFieldConfig(pipelineId);
        // Auto-seed defaults for pipelines created before the config system
        if (configs.length === 0 && allFields.length > 0) {
          const defaultSelections = allFields.map((f, i) => ({
            field_id: f.id,
            enabled: f.is_default,
            sort_order: i,
          }));
          configs = await api.createPipelineFieldConfigs(
            pipelineId,
            defaultSelections
          );
        }
        setFieldConfigs(configs);
      } catch (cfgErr) {
        console.error('Failed to load field config:', cfgErr);
        setFieldConfigs([]);
      }
    } catch (err) {
      console.error('Failed to load stages:', err);
      setStages([]);
      setDeals([]);
      setFieldConfigs([]);
    } finally {
      setStagesLoading(false);
    }
  }, [allFields]);

  useEffect(() => {
    if (selectedId) {
      loadStages(selectedId);
    } else {
      setStages([]);
      setDeals([]);
      setFieldConfigs([]);
    }
  }, [selectedId, loadStages]);

  const selectedPipeline = pipelines.find((p) => p.id === selectedId) || null;

  // ══════════════════════════════════════════
  //  PIPELINE CRUD
  // ══════════════════════════════════════════

  const openCreateModal = () => {
    setCreateName('');
    // Reset selections to defaults
    const selections: Record<string, boolean> = {};
    allFields.forEach((f) => {
      selections[f.id] = f.is_default;
    });
    setCreateFieldSelections(selections);
    setShowCreateModal(true);
  };

  const handleCreatePipeline = async () => {
    if (!createName.trim() || saving) return;
    setSaving(true);
    try {
      // Create the pipeline
      const created = await api.createPipeline({ name: createName.trim() });

      // Create field config rows based on user selections
      const fieldSelections = allFields.map((f, i) => ({
        field_id: f.id,
        enabled: createFieldSelections[f.id] ?? f.is_default,
        sort_order: i,
      }));

      await api.createPipelineFieldConfigs(created.id, fieldSelections);

      setPipelines((prev) => [...prev, created]);
      setSelectedId(created.id);
      setShowCreateModal(false);
      setCreateName('');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Unknown error';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        showAlert({
          title: 'Duplicate Name',
          message: `"${createName.trim()}" already exists.`,
          variant: 'warning',
        });
      } else {
        showAlert({
          title: 'Error',
          message: `Failed to create pipeline: ${msg}`,
          variant: 'danger',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRenamePipeline = async () => {
    if (!selectedPipeline || !renamePipelineName.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await api.updatePipeline(selectedPipeline.id, {
        name: renamePipelineName.trim(),
      });
      setPipelines((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setRenamingPipeline(false);
    } catch (err) {
      console.error('Failed to rename pipeline:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePipeline = async () => {
    if (!selectedPipeline) return;
    const ok = await showConfirm({
      title: 'Delete Pipeline',
      message: `Delete pipeline "${selectedPipeline.name}" and all its stages?`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await api.deletePipeline(selectedPipeline.id);
      const remaining = pipelines.filter((p) => p.id !== selectedPipeline.id);
      setPipelines(remaining);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    } catch (err) {
      console.error('Failed to delete pipeline:', err);
    }
  };

  // ══════════════════════════════════════════
  //  STAGE CRUD
  // ══════════════════════════════════════════

  const handleAddStage = async () => {
    if (!selectedId || !newStageName.trim() || saving) return;
    setSaving(true);
    try {
      const created = await api.createPipelineStage({
        pipeline_id: selectedId,
        name: newStageName.trim(),
        color: newStageColor,
        sort_order: stages.length,
      });
      setStages((prev) => [...prev, created]);
      setNewStageName('');
      setNewStageColor(
        STAGE_COLORS[(stages.length + 1) % STAGE_COLORS.length]
      );
      setShowAddStage(false);
    } catch (err) {
      console.error('Failed to add stage:', err);
    } finally {
      setSaving(false);
    }
  };

  const startEditStage = (stage: PipelineStage) => {
    setEditingStageId(stage.id);
    setEditStageName(stage.name);
    setEditStageColor(stage.color);
  };

  const handleEditStage = async (id: string) => {
    if (!editStageName.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await api.updatePipelineStage(id, {
        name: editStageName.trim(),
        color: editStageColor,
      });
      setStages((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setEditingStageId(null);
    } catch (err) {
      console.error('Failed to update stage:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStage = async (id: string) => {
    const ok = await showConfirm({
      title: 'Delete Stage',
      message: 'Delete this stage and all its deals?',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await api.deletePipelineStage(id);
      setStages((prev) => prev.filter((s) => s.id !== id));
      setDeals((prev) => prev.filter((d) => d.stage_id !== id));
    } catch (err) {
      console.error('Failed to delete stage:', err);
    }
  };

  // ══════════════════════════════════════════
  //  DEAL CRUD
  // ══════════════════════════════════════════

  const openDealModal = (stageId: string) => {
    setEditingDealId(null);
    setDealModalStageId(stageId);
    setDealModalContactId('');
    setDealModalContactSearch('');
    setDealModalFieldData({});
    setShowDealModal(true);
  };

  const openEditDealModal = (deal: PipelineDeal) => {
    setEditingDealId(deal.id);
    setDealModalStageId(deal.stage_id);
    setDealModalContactId(deal.contact_id);
    const c = deal.contact;
    if (c) {
      setDealModalContactSearch(`${c.first_name} ${c.last_name}`);
    } else {
      setDealModalContactSearch('');
    }
    setDealModalFieldData(deal.field_data || {});
    setShowDealModal(true);
  };

  const closeDealModal = () => {
    setShowDealModal(false);
    setEditingDealId(null);
    setDealModalStageId(null);
    setDealModalContactId('');
    setDealModalContactSearch('');
    setDealModalFieldData({});
  };

  const handleSaveDeal = async () => {
    if (!dealModalStageId || !dealModalContactId || saving) return;
    setSaving(true);
    try {
      if (editingDealId) {
        // Update existing deal
        const updated = await api.updatePipelineDeal(editingDealId, {
          stage_id: dealModalStageId,
          field_data: dealModalFieldData,
        });
        setDeals((prev) =>
          prev.map((d) => (d.id === updated.id ? updated : d))
        );
      } else {
        // Create new deal
        const stageDeals = deals.filter(
          (d) => d.stage_id === dealModalStageId
        );
        const created = await api.createPipelineDeal({
          stage_id: dealModalStageId,
          contact_id: dealModalContactId,
          field_data: dealModalFieldData,
          sort_order: stageDeals.length,
        });
        setDeals((prev) => [...prev, created]);
      }
      closeDealModal();
    } catch (err) {
      console.error('Failed to save deal:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    const ok = await showConfirm({
      title: 'Remove Deal',
      message: 'Remove this deal from the pipeline?',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    try {
      await api.deletePipelineDeal(dealId);
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
    } catch (err) {
      console.error('Failed to delete deal:', err);
    }
  };

  // ══════════════════════════════════════════
  //  DRAG AND DROP
  // ══════════════════════════════════════════

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDragDealId(dealId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dealId);
    // Add a slight delay to allow the drag image to render
    setTimeout(() => {
      const card = document.querySelector(`[data-deal-id="${dealId}"]`);
      if (card) card.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = () => {
    if (dragDealId) {
      const card = document.querySelector(`[data-deal-id="${dragDealId}"]`);
      if (card) card.classList.remove('dragging');
    }
    setDragDealId(null);
    setDragOverStageId(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStageId(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStageId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);
    const dealId = e.dataTransfer.getData('text/plain');
    if (!dealId) return;

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === targetStageId) {
      setDragDealId(null);
      return;
    }

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId ? { ...d, stage_id: targetStageId } : d
      )
    );
    setDragDealId(null);

    try {
      await api.updatePipelineDeal(dealId, { stage_id: targetStageId });
    } catch (err) {
      console.error('Failed to move deal:', err);
      // Revert on error
      setDeals((prev) =>
        prev.map((d) =>
          d.id === dealId ? { ...d, stage_id: deal.stage_id } : d
        )
      );
    }
  };

  // ══════════════════════════════════════════
  //  FIELD CONFIG
  // ══════════════════════════════════════════

  const handleToggleField = async (fieldId: string, enabled: boolean) => {
    if (!selectedId) return;
    try {
      await api.updatePipelineFieldConfig(selectedId, fieldId, enabled);
      setFieldConfigs((prev) =>
        prev.map((fc) =>
          fc.field_id === fieldId ? { ...fc, enabled } : fc
        )
      );
    } catch (err) {
      console.error('Failed to toggle field:', err);
    }
  };

  // ── Contact search for deal modal ──
  const filteredContacts = dealModalContactSearch.trim()
    ? state.contacts
        .filter((c) => {
          const term = dealModalContactSearch.toLowerCase();
          const name = `${c.first_name} ${c.last_name}`.toLowerCase();
          const company = c.company?.name?.toLowerCase() || '';
          return name.includes(term) || company.includes(term);
        })
        .slice(0, 8)
    : [];

  // ── Helpers ──
  const dealsForStage = (stageId: string) =>
    deals.filter((d) => d.stage_id === stageId);

  const getContactDisplay = (deal: PipelineDeal) => {
    const c = deal.contact as Contact | null | undefined;
    if (!c) return { name: 'Unknown Contact', company: null };
    return {
      name: `${c.first_name} ${c.last_name}`,
      company: (c as any).company?.name || null,
    };
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // ══════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════

  // Build header action buttons
  const headerActions = (
    <div className="pipeline-header-actions">
      {renamingPipeline && selectedPipeline ? (
        <div className="pipeline-rename-row">
          <input
            className="pipeline-rename-input"
            value={renamePipelineName}
            onChange={(e) => setRenamePipelineName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenamePipeline();
              if (e.key === 'Escape') setRenamingPipeline(false);
            }}
            autoFocus
          />
          <button
            className="pipeline-btn primary"
            onClick={handleRenamePipeline}
            disabled={!renamePipelineName.trim() || saving}
          >
            <Check size={14} /> Save
          </button>
          <button
            className="pipeline-btn"
            onClick={() => setRenamingPipeline(false)}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <button className="pipeline-btn primary" onClick={openCreateModal}>
            <Plus size={14} /> New Pipeline
          </button>
          {selectedPipeline && (
            <>
              <button
                className="pipeline-btn"
                onClick={() => {
                  setRenamePipelineName(selectedPipeline.name);
                  setRenamingPipeline(true);
                }}
              >
                <Pencil size={14} /> Rename
              </button>
              <button
                className="pipeline-btn danger"
                onClick={handleDeletePipeline}
              >
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <PageShell
        title="Pipeline"
        subtitle="Manage your sales pipelines and stages."
      >
        <div className="pipeline-empty-state">
          <p>Loading pipelines…</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Pipeline"
      subtitle="Manage your sales pipelines and stages."
      actions={headerActions}
    >
      {/* ── Toolbar: pipeline selector + actions ── */}
      {pipelines.length > 0 && (
        <div className="pipeline-toolbar">
          <select
            className="pipeline-select"
            value={selectedId || ''}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {selectedPipeline && stages.length > 0 && (
            <button
              className="pipeline-btn primary"
              onClick={() => openDealModal(stages[0].id)}
            >
              <Plus size={14} /> Add to Pipeline
            </button>
          )}

          {selectedPipeline && (
            <button
              className="pipeline-btn"
              onClick={() => setShowFieldConfig(!showFieldConfig)}
              title="Configure card fields"
            >
              <Settings2 size={14} /> Card Fields
            </button>
          )}
        </div>
      )}

      {/* ── Field Config Panel ── */}
      {showFieldConfig && selectedPipeline && (
        <div className="field-config-panel">
          <div className="field-config-header">
            <span className="field-config-title">Card Fields</span>
            <span className="field-config-subtitle">
              Choose which fields appear on deal cards and in the add deal modal
            </span>
          </div>
          <div className="field-config-list">
            {fieldConfigs.map((fc) => {
              const field = fc.field;
              if (!field) return null;
              return (
                <label key={fc.id} className="field-config-item">
                  <input
                    type="checkbox"
                    checked={fc.enabled}
                    onChange={(e) =>
                      handleToggleField(fc.field_id, e.target.checked)
                    }
                  />
                  <span className="field-config-label">{field.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Board or empty state ── */}
      {!selectedPipeline ? (
        <div className="pipeline-empty-state">
          <div className="pipeline-empty-state-icon">
            <Target size={32} />
          </div>
          <h3>No Pipelines Yet</h3>
          <p>
            Create your first pipeline to start tracking sales processes,
            enquiries, and more.
          </p>
          <button className="pipeline-btn primary" onClick={openCreateModal}>
            <Plus size={14} /> Create Pipeline
          </button>
        </div>
      ) : stagesLoading ? (
        <div className="pipeline-empty-state">
          <p>Loading stages…</p>
        </div>
      ) : (
        <div className="pipeline-board">
          {stages.map((stage) => {
            const stageDeals = dealsForStage(stage.id);
            return (
              <div className="stage-column" key={stage.id}>
                <div className="stage-column-header">
                  {editingStageId === stage.id ? (
                    <>
                      <ColorPicker
                        value={editStageColor}
                        onChange={setEditStageColor}
                      />
                      <div className="stage-edit-row">
                        <input
                          className="stage-edit-input"
                          value={editStageName}
                          onChange={(e) => setEditStageName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter')
                              handleEditStage(stage.id);
                            if (e.key === 'Escape')
                              setEditingStageId(null);
                          }}
                          autoFocus
                        />
                        <button
                          className="stage-action-btn"
                          title="Save"
                          onClick={() => handleEditStage(stage.id)}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="stage-action-btn"
                          title="Cancel"
                          onClick={() => setEditingStageId(null)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="stage-color-dot"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="stage-column-name">{stage.name}</span>
                      <span className="stage-deal-count">
                        {stageDeals.length}
                      </span>
                      {(() => {
                        const total = stageDeals.reduce((sum, d) => {
                          const v = Number(d.field_data?.value);
                          return sum + (isNaN(v) ? 0 : v);
                        }, 0);
                        return total > 0 ? (
                          <span className="stage-total-value">
                            {formatCurrency(total)}
                          </span>
                        ) : null;
                      })()}
                      <div className="stage-column-actions">
                        <button
                          className="stage-action-btn"
                          title="Add deal"
                          onClick={() => openDealModal(stage.id)}
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          className="stage-action-btn"
                          title="Edit"
                          onClick={() => startEditStage(stage)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="stage-action-btn danger"
                          title="Delete"
                          onClick={() => handleDeleteStage(stage.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div
                  className={`stage-column-body ${dragOverStageId === stage.id ? 'drag-over' : ''}`}
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  {stageDeals.length === 0 ? (
                    <div className="stage-column-body-empty">
                      <span className="stage-empty-text">No deals yet</span>
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const { name: contactName, company } =
                        getContactDisplay(deal);
                      const fd = deal.field_data || {};
                      return (
                        <div
                          className="deal-card"
                          key={deal.id}
                          data-deal-id={deal.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => openEditDealModal(deal)}
                        >
                          <div className="deal-card-header">
                            <div className="deal-card-drag-handle">
                              <GripVertical size={14} />
                            </div>
                            <div className="deal-card-info">
                              {fd.deal_name && (
                                <span className="deal-card-deal-name">
                                  {fd.deal_name}
                                </span>
                              )}
                              <span className="deal-card-name">
                                <User size={12} /> {contactName}
                              </span>
                              {company && (
                                <span className="deal-card-company">
                                  <Building2 size={12} /> {company}
                                </span>
                              )}
                            </div>
                            <button
                              className="stage-action-btn danger deal-card-delete"
                              title="Remove"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDeal(deal.id);
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Value + Priority row */}
                          {(fd.value != null && fd.value !== '') || fd.priority ? (
                            <div className="deal-card-value-row">
                              {fd.value != null && fd.value !== '' && (
                                <span className="deal-card-value">
                                  {formatCurrency(Number(fd.value))}
                                </span>
                              )}
                              {fd.priority && (
                                <span
                                  className="deal-card-priority"
                                  style={{
                                    color: PRIORITY_COLORS[fd.priority] || '#6b7280',
                                    background: `${PRIORITY_COLORS[fd.priority] || '#6b7280'}14`,
                                  }}
                                >
                                  {fd.priority}
                                </span>
                              )}
                            </div>
                          ) : null}

                          {/* Footer: date + notes */}
                          {(fd.expected_close_date || fd.notes) && (
                            <div className="deal-card-footer">
                              {fd.expected_close_date && (
                                <span className="deal-card-date">
                                  <Calendar size={10} />
                                  {formatDate(fd.expected_close_date)}
                                </span>
                              )}
                              {fd.notes && (
                                <span
                                  className="deal-card-notes"
                                  title={fd.notes}
                                >
                                  <FileText size={10} />
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}

          {/* Add stage column */}
          {showAddStage ? (
            <div className="add-stage-form">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <ColorPicker
                  value={newStageColor}
                  onChange={setNewStageColor}
                />
                <input
                  placeholder="Stage name…"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddStage();
                    if (e.key === 'Escape') {
                      setShowAddStage(false);
                      setNewStageName('');
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="add-stage-form-actions">
                <button
                  className="pipeline-btn primary"
                  onClick={handleAddStage}
                  disabled={!newStageName.trim() || saving}
                  style={{ flex: 1 }}
                >
                  <Check size={14} /> Add Stage
                </button>
                <button
                  className="pipeline-btn"
                  onClick={() => {
                    setShowAddStage(false);
                    setNewStageName('');
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="add-stage-column"
              onClick={() => setShowAddStage(true)}
            >
              <Plus size={24} />
              <span>Add Stage</span>
            </div>
          )}
        </div>
      )}

      {/* ══════ Create Pipeline Modal ══════ */}
      {showCreateModal && (
        <div
          className="pipeline-modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="pipeline-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pipeline-modal-header">
              <h3>Create Pipeline</h3>
              <button
                className="pipeline-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pipeline-modal-body">
              <div className="pipeline-modal-field">
                <label className="pipeline-modal-label">Pipeline Name</label>
                <input
                  className="pipeline-modal-input"
                  placeholder="e.g. Sales Pipeline, Order Tracking…"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && createName.trim())
                      handleCreatePipeline();
                  }}
                  autoFocus
                />
              </div>

              <div className="pipeline-modal-field">
                <label className="pipeline-modal-label">
                  Card Fields
                </label>
                <p className="pipeline-modal-hint">
                  Choose which fields to show on deal cards. You can change
                  these later.
                </p>
                <div className="pipeline-modal-field-list">
                  {allFields.map((field) => (
                    <label
                      key={field.id}
                      className="pipeline-modal-field-option"
                    >
                      <input
                        type="checkbox"
                        checked={createFieldSelections[field.id] ?? false}
                        onChange={(e) =>
                          setCreateFieldSelections((prev) => ({
                            ...prev,
                            [field.id]: e.target.checked,
                          }))
                        }
                      />
                      <span className="pipeline-modal-field-option-label">
                        {field.label}
                      </span>
                      <span className="pipeline-modal-field-option-type">
                        {field.field_type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="pipeline-modal-footer">
              <button
                className="pipeline-btn"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="pipeline-btn primary"
                onClick={handleCreatePipeline}
                disabled={!createName.trim() || saving}
              >
                {saving ? 'Creating…' : 'Create Pipeline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Add Deal Modal ══════ */}
      {showDealModal && (
        <div
          className="pipeline-modal-overlay"
          onClick={() => setShowDealModal(false)}
        >
          <div
            className="pipeline-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pipeline-modal-header">
              <h3>{editingDealId ? 'Edit Deal' : 'Add Deal'}</h3>
              <button
                className="pipeline-modal-close"
                onClick={closeDealModal}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pipeline-modal-body">
              {/* Stage selector */}
              <div className="pipeline-modal-field">
                <label className="pipeline-modal-label">Stage</label>
                <select
                  className="pipeline-modal-input"
                  value={dealModalStageId || ''}
                  onChange={(e) => setDealModalStageId(e.target.value)}
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact search */}
              <div className="pipeline-modal-field">
                <label className="pipeline-modal-label">Contact</label>
                <div className="pipeline-contact-search-wrap">
                  <input
                    className="pipeline-modal-input"
                    placeholder="Search contact…"
                    value={dealModalContactSearch}
                    disabled={!!editingDealId}
                    onChange={(e) => {
                      setDealModalContactSearch(e.target.value);
                      setDealModalContactId('');
                    }}
                  />
                  {filteredContacts.length > 0 && !dealModalContactId && (
                    <div className="pipeline-contact-dropdown">
                      {filteredContacts.map((c) => (
                        <button
                          key={c.id}
                          className="pipeline-contact-option"
                          onClick={() => {
                            setDealModalContactId(c.id);
                            setDealModalContactSearch(
                              `${c.first_name} ${c.last_name}`
                            );
                          }}
                        >
                          <span className="pipeline-contact-option-name">
                            {c.first_name} {c.last_name}
                          </span>
                          {c.company && (
                            <span className="pipeline-contact-option-company">
                              {c.company.name}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic fields based on pipeline config */}
              {enabledFields.map((field) => (
                <div key={field.id} className="pipeline-modal-field">
                  <label className="pipeline-modal-label">
                    {field.label}
                  </label>
                  {field.field_type === 'text' && (
                    <input
                      className="pipeline-modal-input"
                      type="text"
                      placeholder={field.label}
                      value={dealModalFieldData[field.key] ?? ''}
                      onChange={(e) =>
                        setDealModalFieldData((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                    />
                  )}
                  {field.field_type === 'number' && (
                    <input
                      className="pipeline-modal-input"
                      type="number"
                      placeholder="0"
                      value={dealModalFieldData[field.key] ?? ''}
                      onChange={(e) =>
                        setDealModalFieldData((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                    />
                  )}
                  {field.field_type === 'date' && (
                    <DatePicker
                      value={dealModalFieldData[field.key] ?? ''}
                      onChange={(val) =>
                        setDealModalFieldData((prev) => ({
                          ...prev,
                          [field.key]: val,
                        }))
                      }
                      placeholder={field.label}
                    />
                  )}
                  {field.field_type === 'select' && (
                    <select
                      className="pipeline-modal-input"
                      value={dealModalFieldData[field.key] ?? ''}
                      onChange={(e) =>
                        setDealModalFieldData((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select…</option>
                      {(field.field_options?.choices || []).map(
                        (choice: string) => (
                          <option key={choice} value={choice}>
                            {choice}
                          </option>
                        )
                      )}
                    </select>
                  )}
                  {field.field_type === 'textarea' && (
                    <textarea
                      className="pipeline-modal-textarea"
                      placeholder={field.label}
                      rows={3}
                      value={dealModalFieldData[field.key] ?? ''}
                      onChange={(e) =>
                        setDealModalFieldData((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="pipeline-modal-footer">
              {editingDealId && (
                <button
                  className="pipeline-btn danger"
                  onClick={() => {
                    handleDeleteDeal(editingDealId);
                    closeDealModal();
                  }}
                >
                  Delete
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button
                className="pipeline-btn"
                onClick={closeDealModal}
              >
                Cancel
              </button>
              <button
                className="pipeline-btn primary"
                onClick={handleSaveDeal}
                disabled={!dealModalContactId || saving}
              >
                {saving
                  ? 'Saving…'
                  : editingDealId
                    ? 'Save Changes'
                    : 'Add Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
