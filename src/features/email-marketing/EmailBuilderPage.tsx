import { useState, useEffect, useRef, useCallback } from 'react';
import { useAlert } from '@/components/ui/AlertDialog';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import 'react-quill-new/dist/quill.snow.css';
import {
  ArrowLeft, Save, Eye, Check, GripVertical, Trash2, Plus,
  Copy, Send, X, Loader2, Settings, Undo2, Redo2, Clipboard,
} from 'lucide-react';
import {
  fetchEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  updateEmailCampaign,
  fetchEmailCampaign,
} from '@/lib/api';
import { BLOCK_GROUPS, BRAND, makeBlock } from './builder/constants';
import type { BlockData } from './builder/constants';
import { generateEmailHtml } from './builder/mjml';
import { supabase } from '@/lib/supabase';
import { BlockEditPanel } from './builder/BlockEditPanel';
import { BlockPreview, PreviewMode, GlobalSettingsPanel } from './builder/panels';
import './EmailBuilder.css';

/* ── Cache product data before save so MJML can render product blocks ── */
async function cacheProductData(blocks: BlockData[]): Promise<BlockData[]> {
  const productBlocks = blocks.filter(b => b.type === 'product');
  if (productBlocks.length === 0) return blocks;

  // Collect all product IDs across all product blocks
  const allIds = new Set<string>();
  for (const b of productBlocks) {
    const source = b.data.source || 'products';
    if (source === 'products' && b.data.productIds) b.data.productIds.forEach((id: string) => allIds.add(id));
    if (source === 'collection' && b.data.collectionId) {
      const { data: assignments } = await supabase.from('product_collection_assignments').select('product_id').eq('collection_id', b.data.collectionId);
      (assignments || []).forEach((a: any) => allIds.add(a.product_id));
    }
  }

  if (allIds.size === 0) return blocks;
  const idArr = [...allIds];

  // Fetch products + thumbnails + variant prices
  const { data: prods } = await supabase.from('products').select('id, name, price, compare_at_price, description, slug').in('id', idArr);
  const prodMap = new Map((prods || []).map((p: any) => [p.id, p]));

  const { data: variants } = await supabase.from('product_variants').select('product_id, price_override').in('product_id', idArr);
  const variantPrices = new Map<string, number>();
  (variants || []).forEach((v: any) => {
    if (v.price_override != null && v.price_override > 0) {
      const cur = variantPrices.get(v.product_id);
      if (cur == null || v.price_override < cur) variantPrices.set(v.product_id, v.price_override);
    }
  });

  const { data: media } = await supabase.from('product_media').select('product_id, media_url, sort_order').in('product_id', idArr).in('media_type', ['image']).order('sort_order');
  const thumbMap: Record<string, string> = {};
  (media || []).forEach((m: any) => { if (!thumbMap[m.product_id]) thumbMap[m.product_id] = m.media_url; });

  // Attach cached data to each product block
  return blocks.map(b => {
    if (b.type !== 'product') return b;
    const source = b.data.source || 'products';
    let ids: string[] = [];
    if (source === 'products' && b.data.productIds) ids = b.data.productIds;
    else if (source === 'collection') {
      ids = idArr.filter(id => prodMap.has(id));
    }

    const cached = ids.map(id => {
      const p = prodMap.get(id);
      if (!p) return null;
      // Use variant pricing as fallback
      const variantMin = variantPrices.get(id);
      const displayPrice = (variantMin != null && variantMin > 0) ? variantMin : p.price;
      return { name: p.name, price: displayPrice, description: p.description, slug: p.slug, image: thumbMap[id] || '' };
    }).filter(Boolean);

    return { ...b, data: { ...b.data, _cachedProducts: cached } };
  });
}


export function EmailBuilderPage() {
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaignId');
  const isCampaignMode = !!campaignId;

  const [templateName, setTemplateName] = useState(isCampaignMode ? '' : 'Untitled Template');

  // ── Undo/Redo history ──
  const [blocks, setBlocksRaw] = useState<BlockData[]>([]);
  const historyRef = useRef<{ past: BlockData[][]; future: BlockData[][] }>({ past: [], future: [] });
  const skipHistoryRef = useRef(false);

  const setBlocks = useCallback((updater: BlockData[] | ((prev: BlockData[]) => BlockData[])) => {
    setBlocksRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!skipHistoryRef.current) {
        historyRef.current.past = [...historyRef.current.past.slice(-49), prev];
        historyRef.current.future = [];
      }
      skipHistoryRef.current = false;
      return next;
    });
  }, []);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.past.length === 0) return;
    setBlocksRaw(prev => {
      h.future = [prev, ...h.future];
      const restored = h.past[h.past.length - 1];
      h.past = h.past.slice(0, -1);
      return restored;
    });
  }, []);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.future.length === 0) return;
    setBlocksRaw(prev => {
      h.past = [...h.past, prev];
      const restored = h.future[0];
      h.future = h.future.slice(1);
      return restored;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isInput = (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.getAttribute?.('contenteditable');
      if (isInput) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // Block clipboard (copy/paste)
  const copyBlock = useCallback((id: string) => {
    const block = blocks.find(b => b.id === id);
    if (block) localStorage.setItem('eb-clipboard', JSON.stringify(block));
  }, [blocks]);

  const pasteBlock = useCallback(() => {
    try {
      const raw = localStorage.getItem('eb-clipboard');
      if (!raw) return;
      const block = JSON.parse(raw);
      block.id = crypto.randomUUID();
      setBlocks(prev => [...prev, block]);
      setSelectedId(block.id);
    } catch { /* ignore invalid clipboard */ }
  }, [setBlocks]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSubBlock, setSelectedSubBlock] = useState<{ parentId: string; colIdx: number; blockId: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<Record<string, any>>({
    width: 600, bodyBg: '#f5f5f5', contentBg: '#ffffff',
    fontFamily: '', textColor: '#1f2937', linkColor: BRAND,
    logoUrl: '', footerText: '© Isobex Lasers',
    subject: '', previewText: '',
  });

  // DnD state
  const dragSrcRef = useRef<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below'>('below');
  const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);

  const selectedBlock = blocks.find(b => b.id === selectedId) || null;
  const selectedSubBlockObj = (() => {
    if (!selectedSubBlock) return null;
    const parent = blocks.find(b => b.id === selectedSubBlock.parentId);
    if (!parent || parent.type !== 'columns') return null;
    const col = parent.data.columns?.[selectedSubBlock.colIdx];
    return col?.blocks?.find((b: BlockData) => b.id === selectedSubBlock.blockId) || null;
  })();

  // Load existing template/campaign
  useEffect(() => {
    if (routeId) {
      fetchEmailTemplate(routeId).then(t => {
        setExistingId(t.id);
        setTemplateName(t.name || 'Untitled');
        skipHistoryRef.current = true;
        setBlocks(t.blocks ? (typeof t.blocks === 'string' ? JSON.parse(t.blocks) : t.blocks) : []);
        if (t.settings) {
          const s = typeof t.settings === 'string' ? JSON.parse(t.settings) : t.settings;
          setSettings(prev => ({ ...prev, ...s }));
        }
        if (t.subject && !t.settings?.subject) setSettings(prev => ({ ...prev, subject: t.subject }));
      }).catch(err => console.error('Failed to load template:', err));
    }
  }, [routeId]);

  // Load campaign data when in campaign mode
  useEffect(() => {
    if (campaignId) {
      fetchEmailCampaign(campaignId).then(c => {
        setTemplateName(c.name || 'Campaign Email');
        if (c.subject) setSettings(prev => ({ ...prev, subject: c.subject }));
        if (c.blocks && Array.isArray(c.blocks) && c.blocks.length > 0) {
          skipHistoryRef.current = true;
          setBlocks(c.blocks as BlockData[]);
        }
        if (c.settings && typeof c.settings === 'object' && Object.keys(c.settings as object).length > 0) {
          setSettings(prev => ({ ...prev, ...(c.settings as Record<string, any>) }));
        }
      }).catch(err => console.error('Failed to load campaign:', err));
    }
  }, [campaignId]);

  // Block mutations
  function addBlock(type: string, atIdx: number | null = null) {
    const b = makeBlock(type);
    setBlocks(prev => { const next = [...prev]; if (atIdx !== null) next.splice(atIdx, 0, b); else next.push(b); return next; });
    setSelectedId(b.id); setShowSettings(false);
  }
  function addBlockToColumn(parentId: string, colIdx: number, type: string) {
    const nb = makeBlock(type);
    setBlocks(prev => prev.map(b => {
      if (b.id !== parentId) return b;
      const cols = [...(b.data.columns || [{ blocks: [] }, { blocks: [] }])];
      cols[colIdx] = { ...cols[colIdx], blocks: [...(cols[colIdx].blocks || []), nb] };
      return { ...b, data: { ...b.data, columns: cols } };
    }));
  }
  function updateBlock(id: string, patch: Record<string, any>) { setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b)); }
  function updateSubBlock(parentId: string, colIdx: number, blockId: string, patch: Record<string, any>) {
    setBlocks(prev => prev.map(b => {
      if (b.id !== parentId) return b;
      const cols = (b.data.columns || []).map((col: any, ci: number) => {
        if (ci !== colIdx) return col;
        return { ...col, blocks: (col.blocks || []).map((sb: BlockData) => sb.id === blockId ? { ...sb, ...patch } : sb) };
      });
      return { ...b, data: { ...b.data, columns: cols } };
    }));
  }
  function deleteSubBlock(parentId: string, colIdx: number, blockId: string) {
    setBlocks(prev => prev.map(b => {
      if (b.id !== parentId) return b;
      const cols = (b.data.columns || []).map((col: any, ci: number) => {
        if (ci !== colIdx) return col;
        return { ...col, blocks: (col.blocks || []).filter((sb: BlockData) => sb.id !== blockId) };
      });
      return { ...b, data: { ...b.data, columns: cols } };
    }));
    setSelectedSubBlock(null);
  }
  function deleteBlock(id: string) { setBlocks(prev => prev.filter(b => b.id !== id)); if (selectedId === id) setSelectedId(null); }
  function duplicateBlock(id: string) {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const clone = { ...JSON.parse(JSON.stringify(blocks[idx])), id: crypto.randomUUID() };
    setBlocks(prev => { const next = [...prev]; next.splice(idx + 1, 0, clone); return next; });
    setSelectedId(clone.id);
  }
  function reorderBlocks(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    setBlocks(prev => { const next = [...prev]; const [m] = next.splice(fromIdx, 1); next.splice(toIdx, 0, m); return next; });
  }

  // DnD handlers
  function handlePaletteDragStart(e: React.DragEvent, type: string) { e.dataTransfer.setData('text/plain', type); e.dataTransfer.effectAllowed = 'copy'; }
  function handleBlockDragStart(e: React.DragEvent, idx: number) { dragSrcRef.current = idx; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', '__reorder__'); }
  function handleBlockDragEnd() { dragSrcRef.current = null; setDropTargetIdx(null); }
  function handleBlockDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setDropTargetIdx(idx); setDropPosition(e.clientY < rect.top + rect.height / 2 ? 'above' : 'below'); }
  function handleBlockDrop(e: React.DragEvent, targetIdx: number) {
    e.preventDefault(); e.stopPropagation();
    const data = e.dataTransfer.getData('text/plain');
    if (data === '__reorder__' && dragSrcRef.current != null) {
      const fromIdx = dragSrcRef.current;
      const insertAt = dropPosition === 'above' ? targetIdx : targetIdx + 1;
      reorderBlocks(fromIdx, fromIdx < insertAt ? insertAt - 1 : insertAt);
    } else if (data && data !== '__reorder__') {
      addBlock(data, dropPosition === 'above' ? targetIdx : targetIdx + 1);
    }
    setDropTargetIdx(null);
  }
  function handleCanvasDrop(e: React.DragEvent) {
    setIsCanvasDragOver(false);
    const data = e.dataTransfer.getData('text/plain');
    if (data && data !== '__reorder__') addBlock(data);
  }

  // Save
  async function handleSave() {
    setSaving(true);
    try {
      // Cache product data for product blocks before generating MJML
      const blocksToSave = await cacheProductData(blocks);
      const mjmlSource = generateEmailHtml(blocksToSave, settings, true);
      if (isCampaignMode) {
        await updateEmailCampaign(campaignId!, { name: templateName, subject: settings.subject || templateName, blocks: blocksToSave, settings, html_content: mjmlSource });
      } else {
        const payload = { name: templateName, subject: settings.subject || templateName, blocks: blocksToSave, settings, mjml_source: mjmlSource, active: true };
        if (existingId) {
          await updateEmailTemplate(existingId, payload);
        } else {
          const created = await createEmailTemplate(payload);
          if (created?.id) { setExistingId(created.id); navigate(`/email-marketing/builder/${created.id}`, { replace: true }); }
        }
      }
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
      showAlert({ title: 'Save Failed', message: 'Failed to save. Please try again.', variant: 'danger' });
    } finally { setSaving(false); }
  }

  // Render
  return (
    <div className={`eb-root${isPreview ? ' eb-preview-active' : ''}`}>
      {/* Topbar */}
      <div className="eb-topbar">
        <button className="row-action-btn" onClick={() => isPreview ? setIsPreview(false) : navigate(isCampaignMode ? '/email-marketing?tab=campaigns' : '/email-marketing')} title={isPreview ? 'Back to editing' : 'Back'}>
          <ArrowLeft size={16} />
        </button>
        <div className="eb-topbar-sep" />
        <input className="eb-topbar-title" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder={isCampaignMode ? 'Campaign email name…' : 'Template name…'} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 2, marginRight: 4 }}>
            <button className="row-action-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" style={{ opacity: canUndo ? 1 : 0.3 }}><Undo2 size={15} /></button>
            <button className="row-action-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" style={{ opacity: canRedo ? 1 : 0.3 }}><Redo2 size={15} /></button>
          </div>
          {localStorage.getItem('eb-clipboard') && (
            <button className="btn-secondary" onClick={pasteBlock} title="Paste copied block"><Clipboard size={14} /> Paste</button>
          )}
          <button className="btn-secondary" onClick={() => setShowTestModal(true)} title="Send test"><Send size={14} /> Send Test</button>
          <button className={`btn-secondary${justSaved ? '' : ''}`} onClick={handleSave} disabled={saving}
            style={justSaved ? { background: 'var(--color-success)', color: '#fff', borderColor: 'var(--color-success)' } : { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}>
            {saving ? <><Loader2 size={14} className="eb-spin" /> Saving…</> : justSaved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
          </button>
          {isCampaignMode && (
            <button className="btn-secondary" onClick={async () => {
              setSaving(true);
              try {
                const cachedBlocks = await cacheProductData(blocks);
                const mjmlSource = generateEmailHtml(cachedBlocks, settings, true);
                await updateEmailCampaign(campaignId!, { name: templateName, subject: settings.subject || templateName, blocks: cachedBlocks, settings, html_content: mjmlSource });
                navigate(`/email-marketing?tab=campaigns&campaignId=${campaignId}&step=2`);
              } catch (err) {
                console.error('Save failed:', err);
                showAlert({ title: 'Save Failed', message: 'Failed to save. Please try again.', variant: 'danger' });
              } finally { setSaving(false); }
            }} style={{ background: '#8b5cf6', color: '#fff', borderColor: '#8b5cf6' }}
              disabled={saving}>
              {saving ? <><Loader2 size={14} className="eb-spin" /> Saving…</> : <><Send size={14} /> Save & Continue</>}
            </button>
          )}
          <button className={`btn-secondary${isPreview ? '' : ''}`} onClick={() => setIsPreview(p => !p)}
            style={isPreview ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' } : {}}>
            <Eye size={14} /> {isPreview ? 'Editing' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="eb-body">
        {/* Left Palette */}
        {!isPreview && <div className="eb-left">
          <div className="eb-left-header">Content Blocks</div>
          <div className="eb-left-scroll">
            {BLOCK_GROUPS.map(group => (
              <div key={group.label} className="eb-palette-group">
                <div className="eb-palette-group-label">{group.label}</div>
                {group.blocks.map(({ type, label, icon: BIcon }) => (
                  <button key={type} className="eb-palette-item" draggable onDragStart={e => handlePaletteDragStart(e, type)} onClick={() => addBlock(type)}>
                    <span className="eb-palette-icon"><BIcon size={14} /></span> {label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>}

        {/* Canvas */}
        <div className="eb-canvas">
          {isPreview ? (
            <PreviewMode blocks={blocks} settings={settings} onExit={() => setIsPreview(false)} />
          ) : (
            <div className="eb-canvas-scroll">
              <div className="eb-canvas-body">
                <div className="eb-email-frame" style={{ maxWidth: settings.width || 600, margin: '0 auto', background: settings.contentBg || '#fff', fontFamily: settings.fontFamily || 'inherit', color: settings.textColor || 'inherit' }}>
                  {settings.logoUrl && <div className="eb-email-header" onClick={() => { setShowSettings(true); setSelectedId(null); }}><img src={settings.logoUrl} alt="Logo" style={{ maxHeight: 40, maxWidth: '50%' }} /></div>}
                  <div className="eb-email-content"
                    onDragOver={e => { e.preventDefault(); if (blocks.length === 0) setIsCanvasDragOver(true); }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsCanvasDragOver(false); }}
                  >
                    {blocks.length === 0 ? (
                      <div className={`eb-canvas-empty${isCanvasDragOver ? ' drag-over' : ''}`}
                        onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); e.stopPropagation(); handleCanvasDrop(e); }}>
                        <Plus size={32} style={{ opacity: .4 }} />
                        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '8px 0 4px' }}>Add content to your email</h3>
                        <p style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.5, color: 'var(--color-text-tertiary)' }}>Drag blocks from the left panel or click to add them.</p>
                      </div>
                    ) : (
                      <>
                        {blocks.map((block, idx) => (
                          <div key={block.id}>
                            {dropTargetIdx === idx && dropPosition === 'above' && <div className="eb-drop-indicator" />}
                            <div className={`eb-block${selectedId === block.id ? ' selected' : ''}${dragSrcRef.current === idx ? ' eb-block--dragging' : ''}`}
                              onClick={() => { setSelectedId(block.id); setShowSettings(false); setSelectedSubBlock(null); }}
                              draggable onDragStart={e => handleBlockDragStart(e, idx)} onDragEnd={handleBlockDragEnd}
                              onDragOver={e => handleBlockDragOver(e, idx)} onDrop={e => handleBlockDrop(e, idx)}>
                              <div className="eb-block-handle"><GripVertical size={14} /></div>
                              <div className="eb-block-actions">
                                <button className="row-action-btn" onClick={e => { e.stopPropagation(); copyBlock(block.id); }} title="Copy"><Clipboard size={12} /></button>
                                <button className="row-action-btn" onClick={e => { e.stopPropagation(); duplicateBlock(block.id); }} title="Duplicate"><Copy size={12} /></button>
                                <button className="row-action-btn danger" onClick={e => { e.stopPropagation(); deleteBlock(block.id); }} title="Delete"><Trash2 size={12} /></button>
                              </div>
                              <BlockPreview block={block} isPreview={false} onColumnDrop={addBlockToColumn} globalSettings={settings}
                                onSubBlockSelect={(pid, ci, bid) => { setSelectedId(pid); setSelectedSubBlock({ parentId: pid, colIdx: ci, blockId: bid }); setShowSettings(false); }}
                                selectedSubBlockId={selectedSubBlock?.blockId} />
                            </div>
                            {dropTargetIdx === idx && dropPosition === 'below' && <div className="eb-drop-indicator" />}
                          </div>
                        ))}
                        <div style={{ minHeight: 40 }} onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={e => { e.preventDefault(); e.stopPropagation(); const d = e.dataTransfer.getData('text/plain'); if (d && d !== '__reorder__') addBlock(d); }} />
                      </>
                    )}
                  </div>
                  {settings.footerText && <div className="eb-email-footer" onClick={() => { setShowSettings(true); setSelectedId(null); }}>{settings.footerText}</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        {!isPreview && <div className="eb-right">
          {showSettings || !selectedBlock ? (
            showSettings ? <GlobalSettingsPanel settings={settings} onUpdate={setSettings} /> : (
              <div className="eb-right-empty">
                <Settings size={32} style={{ opacity: .3 }} />
                <div><div style={{ fontWeight: 600, marginBottom: 4 }}>Select a block</div><div style={{ fontSize: 13, lineHeight: 1.5 }}>Click any block to edit, or</div></div>
                <button className="btn-secondary" onClick={() => setShowSettings(true)}><Settings size={14} /> Email Settings</button>
              </div>
            )
          ) : selectedSubBlockObj ? (
            <BlockEditPanel block={selectedSubBlockObj}
              onUpdate={patch => updateSubBlock(selectedSubBlock!.parentId, selectedSubBlock!.colIdx, selectedSubBlock!.blockId, patch)}
              onDelete={() => deleteSubBlock(selectedSubBlock!.parentId, selectedSubBlock!.colIdx, selectedSubBlock!.blockId)}
              onBack={() => setSelectedSubBlock(null)} />
          ) : (
            <BlockEditPanel block={selectedBlock} onUpdate={patch => updateBlock(selectedBlock.id, patch)} onDelete={() => deleteBlock(selectedBlock.id)} />
          )}
        </div>}
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="eb-test-modal-overlay" onClick={() => setShowTestModal(false)}>
          <div className="eb-test-modal" onClick={e => e.stopPropagation()}>
            <div className="eb-test-modal-header">
              <h3>Send Test Email</h3>
              <button className="row-action-btn" onClick={() => setShowTestModal(false)}><X size={16} /></button>
            </div>
            <div className="eb-test-modal-body">
              <div className="form-group"><label>Recipient Email</label><input className="form-input" type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com" /></div>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Merge tags will be replaced with sample data.</p>
            </div>
            <div className="eb-test-modal-footer">
              <button className="btn-secondary" onClick={() => setShowTestModal(false)}>Cancel</button>
              <button className="btn-secondary" style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}
                disabled={!testEmail.trim() || saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const cachedBlocks = await cacheProductData(blocks);
                    const html = generateEmailHtml(cachedBlocks, settings, true);
                    const res = await supabase.functions.invoke('send-email', {
                      body: { action: 'test_builder', html, subject: settings.subject || templateName, toEmail: testEmail.trim() },
                    });
                    if (res.error) {
                      let detail = 'Failed to send test email';
                      try { const body = res.data; if (body?.error) detail = body.error; } catch { /* ignore */ }
                      throw new Error(detail);
                    }
                    if (res.data?.error) throw new Error(res.data.error);
                    showAlert({ title: 'Test Email Sent', message: `Test email sent to ${testEmail.trim()}!`, variant: 'success' });
                    setShowTestModal(false);
                  } catch (err: any) {
                    showAlert({ title: 'Send Failed', message: err.message || 'Failed to send test email. Make sure SMTP is configured in Settings → Email / SMTP.', variant: 'danger' });
                  } finally { setSaving(false); }
                }}>
                {saving ? <><Loader2 size={14} className="eb-spin" /> Sending…</> : <><Send size={14} /> Send Test</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
