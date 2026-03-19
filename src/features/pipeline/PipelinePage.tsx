import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { useAlert } from '@/components/ui/AlertDialog';
import { useData } from '@/context/DataContext';
import * as api from '@/lib/api';
import type { Pipeline, PipelineStage, PipelineDeal, Contact } from '@/types/database';
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Building2,
  User,
} from 'lucide-react';
import './PipelinePage.css';

const STAGE_COLORS = [
  '#6b7280', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f59e0b', '#10b981', '#ef4444', '#06b6d4',
];

export function PipelinePage() {
  const { state } = useData();
  const { showAlert, showConfirm } = useAlert();

  // ── Pipeline list state ──
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Pipeline CRUD inline state ──
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [renamingPipeline, setRenamingPipeline] = useState(false);
  const [renamePipelineName, setRenamePipelineName] = useState('');
  const [saving, setSaving] = useState(false);

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
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [addDealStageId, setAddDealStageId] = useState<string | null>(null);
  const [addDealContactId, setAddDealContactId] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  // ── Load pipelines on mount ──
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

  // ── Load stages + deals when pipeline changes ──
  const loadStages = useCallback(async (pipelineId: string) => {
    setStagesLoading(true);
    try {
      const stData = await api.fetchPipelineStages(pipelineId);
      setStages(stData);
      // Load deals for all stages (separate try so stages still show if deals table missing)
      try {
        const stageIds = stData.map((s) => s.id);
        const dlData = await api.fetchPipelineDeals(stageIds);
        setDeals(dlData);
      } catch (dealErr) {
        console.error('Failed to load deals:', dealErr);
        setDeals([]);
      }
    } catch (err) {
      console.error('Failed to load stages:', err);
      setStages([]);
      setDeals([]);
    } finally {
      setStagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadStages(selectedId);
    } else {
      setStages([]);
      setDeals([]);
    }
  }, [selectedId, loadStages]);

  const selectedPipeline = pipelines.find((p) => p.id === selectedId) || null;

  // ═══════ Pipeline CRUD ═══════

  const handleCreatePipeline = async () => {
    if (!createName.trim() || saving) return;
    setSaving(true);
    try {
      const created = await api.createPipeline({ name: createName.trim() });
      setPipelines((prev) => [...prev, created]);
      setSelectedId(created.id);
      setCreateName('');
      setShowCreate(false);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message : 'Unknown error';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        showAlert({ title: 'Duplicate Name', message: `"${createName.trim()}" already exists.`, variant: 'warning' });
      } else {
        showAlert({ title: 'Error', message: `Failed to create pipeline: ${msg}`, variant: 'danger' });
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

  // ═══════ Stage CRUD ═══════

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
      setNewStageColor(STAGE_COLORS[(stages.length + 1) % STAGE_COLORS.length]);
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
      setStages((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
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

  // ═══════ Deal CRUD ═══════

  const openAddDeal = (stageId: string) => {
    setAddDealStageId(stageId);
    setAddDealContactId('');
    setContactSearch('');
    setShowAddDeal(true);
  };

  const handleAddDeal = async () => {
    if (!addDealStageId || !addDealContactId || saving) return;
    setSaving(true);
    try {
      const stageDeals = deals.filter((d) => d.stage_id === addDealStageId);
      const created = await api.createPipelineDeal({
        stage_id: addDealStageId,
        contact_id: addDealContactId,
        sort_order: stageDeals.length,
      });
      setDeals((prev) => [...prev, created]);
      setShowAddDeal(false);
      setAddDealStageId(null);
      setAddDealContactId('');
      setContactSearch('');
    } catch (err) {
      console.error('Failed to add deal:', err);
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

  // ── Filter contacts for the search dropdown ──
  const filteredContacts = contactSearch.trim()
    ? state.contacts.filter((c) => {
        const term = contactSearch.toLowerCase();
        const name = `${c.first_name} ${c.last_name}`.toLowerCase();
        const company = c.company?.name?.toLowerCase() || '';
        return name.includes(term) || company.includes(term);
      }).slice(0, 8)
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

  // ═══════ Render ═══════

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
          <button className="pipeline-btn" onClick={() => setRenamingPipeline(false)}>
            <X size={14} />
          </button>
        </div>
      ) : showCreate ? (
        <div className="pipeline-create-form">
          <input
            className="pipeline-create-input"
            placeholder="Pipeline name…"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreatePipeline();
              if (e.key === 'Escape') {
                setShowCreate(false);
                setCreateName('');
              }
            }}
            autoFocus
          />
          <button
            className="pipeline-btn primary"
            onClick={handleCreatePipeline}
            disabled={!createName.trim() || saving}
          >
            <Check size={14} /> Create
          </button>
          <button
            className="pipeline-btn"
            onClick={() => { setShowCreate(false); setCreateName(''); }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <button className="pipeline-btn primary" onClick={() => setShowCreate(true)}>
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
              <button className="pipeline-btn danger" onClick={handleDeletePipeline}>
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
      <PageShell title="Pipeline" subtitle="Manage your sales pipelines and stages.">
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
      {/* ── Toolbar: pipeline selector + add to pipeline ── */}
      {pipelines.length > 0 && (
        <div className="pipeline-toolbar">
          <select
            className="pipeline-select"
            value={selectedId || ''}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {selectedPipeline && stages.length > 0 && !showAddDeal && (
            <button
              className="pipeline-btn primary"
              onClick={() => openAddDeal(stages[0].id)}
            >
              <Plus size={14} /> Add to Pipeline
            </button>
          )}

          {/* Inline add deal form */}
          {showAddDeal && (
            <div className="pipeline-add-deal-form">
              <select
                className="pipeline-select"
                value={addDealStageId || ''}
                onChange={(e) => setAddDealStageId(e.target.value)}
                style={{ minWidth: 140 }}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <div className="pipeline-contact-search-wrap">
                <input
                  className="pipeline-rename-input"
                  placeholder="Search contact…"
                  value={contactSearch}
                  onChange={(e) => {
                    setContactSearch(e.target.value);
                    setAddDealContactId('');
                  }}
                  autoFocus
                />
                {filteredContacts.length > 0 && !addDealContactId && (
                  <div className="pipeline-contact-dropdown">
                    {filteredContacts.map((c) => (
                      <button
                        key={c.id}
                        className="pipeline-contact-option"
                        onClick={() => {
                          setAddDealContactId(c.id);
                          setContactSearch(`${c.first_name} ${c.last_name}`);
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

              <button
                className="pipeline-btn primary"
                onClick={handleAddDeal}
                disabled={!addDealContactId || saving}
              >
                <Check size={14} /> Add
              </button>
              <button
                className="pipeline-btn"
                onClick={() => {
                  setShowAddDeal(false);
                  setAddDealStageId(null);
                  setAddDealContactId('');
                  setContactSearch('');
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}
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
          <button className="pipeline-btn primary" onClick={() => setShowCreate(true)}>
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
                      <ColorPicker value={editStageColor} onChange={setEditStageColor} />
                      <div className="stage-edit-row">
                        <input
                          className="stage-edit-input"
                          value={editStageName}
                          onChange={(e) => setEditStageName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditStage(stage.id);
                            if (e.key === 'Escape') setEditingStageId(null);
                          }}
                          autoFocus
                        />
                        <button className="stage-action-btn" title="Save" onClick={() => handleEditStage(stage.id)}>
                          <Check size={14} />
                        </button>
                        <button className="stage-action-btn" title="Cancel" onClick={() => setEditingStageId(null)}>
                          <X size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="stage-color-dot" style={{ backgroundColor: stage.color }} />
                      <span className="stage-column-name">{stage.name}</span>
                      <span className="stage-deal-count">{stageDeals.length}</span>
                      <div className="stage-column-actions">
                        <button className="stage-action-btn" title="Add deal" onClick={() => openAddDeal(stage.id)}>
                          <Plus size={14} />
                        </button>
                        <button className="stage-action-btn" title="Edit" onClick={() => startEditStage(stage)}>
                          <Pencil size={14} />
                        </button>
                        <button className="stage-action-btn danger" title="Delete" onClick={() => handleDeleteStage(stage.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="stage-column-body">
                  {stageDeals.length === 0 ? (
                    <div className="stage-column-body-empty">
                      <span className="stage-empty-text">No deals yet</span>
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const { name, company } = getContactDisplay(deal);
                      return (
                        <div className="deal-card" key={deal.id}>
                          <div className="deal-card-header">
                            <div className="deal-card-info">
                              <span className="deal-card-name">
                                <User size={12} /> {name}
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
                              onClick={() => handleDeleteDeal(deal.id)}
                            >
                              <X size={14} />
                            </button>
                          </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <ColorPicker value={newStageColor} onChange={setNewStageColor} />
                <input
                  placeholder="Stage name…"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddStage();
                    if (e.key === 'Escape') { setShowAddStage(false); setNewStageName(''); }
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
                <button className="pipeline-btn" onClick={() => { setShowAddStage(false); setNewStageName(''); }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="add-stage-column" onClick={() => setShowAddStage(true)}>
              <Plus size={24} />
              <span>Add Stage</span>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
