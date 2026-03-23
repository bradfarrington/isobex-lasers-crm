import { useState, useEffect, useRef, useCallback } from 'react';
import { useAlert } from '@/components/ui/AlertDialog';
import { useNavigate } from 'react-router-dom';
import { BlockEditor } from './BlockEditor';
import * as api from '@/lib/api';
import type { StorePage, PageBlock, BlockType, StoreConfig } from '@/types/database';
import {
  ArrowLeft, Save, Eye, Trash2,
  GripVertical, X, Monitor, Smartphone, Layout, Paintbrush,
  Type, ShoppingCart, ShoppingBag, ShoppingBasket, Menu
} from 'lucide-react';
import './UnifiedBuilder.css';
import '../storefront/StorefrontLayout.css';
import { GlobalSettingsEditor } from './GlobalSettingsEditor';
import { BLOCK_OPTIONS, CATEGORIES } from './BlockLibrary';
import { StoreConfigContext } from '../storefront/useStoreConfig';
import { BlockContent } from '../storefront/BlockRenderer';
import { SocialIcon } from '../storefront/SocialIcons';

type LeftTab = 'library' | 'layout' | 'settings';
type BuilderPanel = 'brand' | 'typography' | 'header' | 'footer';

const SETTINGS_PANELS: { key: BuilderPanel; label: string; icon: any }[] = [
  { key: 'brand', label: 'Brand & Colours', icon: Paintbrush },
  { key: 'typography', label: 'Typography', icon: Type },
  { key: 'header', label: 'Header', icon: Layout },
  { key: 'footer', label: 'Footer', icon: Layout },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function UnifiedBuilder() {
  const navigate = useNavigate();
  const { showConfirm, showAlert } = useAlert();

  // Active Context
  const [leftTab, setLeftTab] = useState<LeftTab>('layout');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  // Data State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Pages State
  const [pages, setPages] = useState<StorePage[]>([]);
  const [selectedPage, setSelectedPage] = useState<StorePage | null>(null);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  
  // UI Selection State
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<BuilderPanel | null>(null);

  // Drag State
  const dragSrcRef = useRef<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<'above' | 'below'>('below');
  const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);

  // Settings State
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [draftConfig, setDraftConfig] = useState<Partial<StoreConfig>>({});

  useEffect(() => {
    Promise.all([api.fetchStorePages(), api.fetchStoreConfig()])
      .then(([p, cfg]) => {
        setPages(p);
        if (p.length > 0) {
          setSelectedPage(p[0]);
          setBlocks(p[0].blocks || []);
        }
        setConfig(cfg);
        setDraftConfig(cfg);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

  }, []);

  const selectPage = useCallback(async (pageId: string) => {
    if (hasChanges) {
      const ok = await showConfirm({ title: 'Unsaved Changes', message: 'You have unsaved changes. Switch page anyway?', variant: 'warning', confirmLabel: 'Switch Page' });
      if (!ok) return;
    }
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    setSelectedPage(page);
    setBlocks(page.blocks || []);
    setEditingBlockId(null);
    setHasChanges(false);
    setActivePanel(null);
  }, [hasChanges, pages, showConfirm]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedPage) {
        const updatedPage = await api.updateStorePage(selectedPage.id, { blocks });
        setPages(prev => prev.map(p => p.id === updatedPage.id ? updatedPage : p));
        setSelectedPage(updatedPage);
      }
      if (draftConfig) {
        const savedConfig = await api.updateStoreConfig(draftConfig as any);
        setConfig(savedConfig);
        setDraftConfig(savedConfig);
      }
      setHasChanges(false);
      showAlert({ title: 'Saved', message: 'Changes saved successfully.', variant: 'success' });
    } catch (err) {
      console.error('Save failed:', err);
      showAlert({ title: 'Error', message: 'Failed to save changes.', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Block Operations ───
  const addBlock = (type: BlockType, index?: number) => {
    const newBlock: PageBlock = { id: generateId(), type, config: getDefaultConfig(type) };
    setBlocks(prev => {
      const copy = [...prev];
      if (index !== undefined) copy.splice(index, 0, newBlock);
      else copy.push(newBlock);
      return copy;
    });
    setEditingBlockId(newBlock.id);
    setActivePanel(null);
    setHasChanges(true);
  };

  const removeBlock = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (editingBlockId === id) setEditingBlockId(null);
    setHasChanges(true);
  };

  // ─── Native Canvas Drag & Drop ───
  const handlePaletteDragStart = (e: React.DragEvent, type: BlockType) => {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleBlockDragStart = (e: React.DragEvent, index: number) => {
    dragSrcRef.current = index;
    e.dataTransfer.setData('text/plain', '__reorder__');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleBlockDragEnd = () => {
    dragSrcRef.current = null;
    setDragTargetIndex(null);
  };

  const handleBlockDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDragTargetIndex(index);
    setDragPosition(e.clientY < rect.top + rect.height / 2 ? 'above' : 'below');
  };

  const handleBlockDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const data = e.dataTransfer.getData('text/plain');
    const insertAt = dragPosition === 'above' ? targetIndex : targetIndex + 1;

    if (data === '__reorder__' && dragSrcRef.current != null) {
      const fromIdx = dragSrcRef.current;
      if (fromIdx === targetIndex) {
        setDragTargetIndex(null);
        return;
      }
      setBlocks(prev => {
        const copy = [...prev];
        const [moved] = copy.splice(fromIdx, 1);
        const adjustedInsertAt = fromIdx < insertAt ? insertAt - 1 : insertAt;
        copy.splice(adjustedInsertAt, 0, moved);
        return copy;
      });
      setHasChanges(true);
    } else if (data && data !== '__reorder__') {
      addBlock(data as BlockType, insertAt);
    }
    setDragTargetIndex(null);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    setIsCanvasDragOver(false);
    const data = e.dataTransfer.getData('text/plain');
    if (data && data !== '__reorder__') {
      addBlock(data as BlockType);
    }
  };

  const updateBlockConfig = (id: string, c: Record<string, any>) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, config: c } : b)));
    setHasChanges(true);
  };

  const updateDraft = (updates: Partial<StoreConfig>) => {
    setDraftConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  if (loading) return <div className="ub-loading">Loading builder...</div>;

  const editingBlock = blocks.find(b => b.id === editingBlockId) || null;

  // ─── Storefront Global Render Props ───
  const headerLayout: any = draftConfig?.header_layout || {};
  const navLinks = headerLayout.nav_links || [];
  const showAnnouncement = draftConfig?.announcement_bar_active && 
    (draftConfig?.announcement_bar_text || headerLayout.ticker_messages?.length > 0);

  const hBg = headerLayout.bg_color || '#ffffff';
  const hColor = headerLayout.nav_color || '#000000';
  const hFont = headerLayout.nav_font && headerLayout.nav_font !== 'inherit' ? `"${headerLayout.nav_font}", sans-serif` : 'inherit';
  const cartIconColor = headerLayout.cart_icon_color || hColor;
  
  const annBg = headerLayout.announcement_bg_color || '#000000';
  const annColor = headerLayout.announcement_text_color || '#ffffff';
  const annFont = headerLayout.announcement_font || 'inherit';

  const isTicker = headerLayout.announcement_type === 'ticker';
  const tickerSpacing = headerLayout.ticker_spacing || 50;
  const tickerSpeed = headerLayout.ticker_speed || 20;
  const tickerRepeat = headerLayout.ticker_repeat || 5;
  const tickerMessages = headerLayout.ticker_messages?.length > 0 
      ? headerLayout.ticker_messages 
      : [draftConfig?.announcement_bar_text].filter(Boolean);
  
  const repeatedContent: string[] = [];
  for (let i = 0; i < tickerRepeat; i++) {
    repeatedContent.push(...tickerMessages);
  }

  const CartIconCmp = headerLayout.cart_icon_type === 'ShoppingBag' ? ShoppingBag :
                      headerLayout.cart_icon_type === 'ShoppingBasket' ? ShoppingBasket : ShoppingCart;

  const themeVars: Record<string, string> = {
    '--sf-primary': draftConfig?.color_primary || '#2563eb',
    '--sf-secondary': draftConfig?.color_secondary || '#1e40af',
    '--sf-accent': draftConfig?.color_accent || '#f59e0b',
    '--sf-bg': draftConfig?.color_background || '#ffffff',
    '--sf-surface': draftConfig?.color_surface || '#f8fafc',
    '--sf-text': draftConfig?.color_text || '#0f172a',
    '--sf-text-secondary': draftConfig?.color_text_secondary || '#64748b',
    '--sf-font-heading': draftConfig?.font_heading || 'Inter',
    '--sf-font-body': draftConfig?.font_body || 'Inter',
  };

  return (
    <div className="unified-builder-root" style={themeVars as React.CSSProperties}>
      {/* ─── LEFT SIDEBAR ─── */}
      <div className="ub-left-sidebar">
        <div className="ub-left-header">
          <button className="ub-back-btn" onClick={() => navigate('/store')}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ fontWeight: 600 }}>Store Builder</div>
        </div>
        
        <div className="ub-tabs">
          <button className={`ub-tab ${leftTab === 'library' ? 'active' : ''}`} onClick={() => { setLeftTab('library'); setActivePanel(null); }}>Library</button>
          <button className={`ub-tab ${leftTab === 'layout' ? 'active' : ''}`} onClick={() => { setLeftTab('layout'); setActivePanel(null); }}>Layout</button>
          <button className={`ub-tab ${leftTab === 'settings' ? 'active' : ''}`} onClick={() => { setLeftTab('settings'); setEditingBlockId(null); }}>Settings</button>
        </div>

        <div className="ub-sidebar-content">
          {leftTab === 'library' && (
            <div className="ub-library-tab">
              <div className="ub-blocks-header"><span>Drag blocks into canvas</span></div>
              {CATEGORIES.map((cat) => {
                const options = BLOCK_OPTIONS.filter((o) => o.category === cat);
                if (options.length === 0) return null;
                return (
                  <div key={cat} className="ub-library-category" style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.8125rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>{cat}</h4>
                    <div className="ub-library-grid">
                      {options.map((opt) => (
                        <div
                          key={opt.type}
                          className="ub-library-item"
                          draggable
                          onDragStart={(e) => handlePaletteDragStart(e, opt.type as BlockType)}
                          onClick={() => addBlock(opt.type as BlockType)} 
                        >
                          <div className="ub-library-icon">{opt.icon}</div>
                          <div className="ub-library-label">{opt.label}</div>
                          <div className="ub-library-desc">{opt.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {leftTab === 'layout' && (
            <div>

              <div className="ub-blocks-header"><span>{blocks.length} Blocks in Layout</span></div>
              <div className="ub-block-list">
                {/* Global Header pinned to top */}
                <div className={`ub-block-item ${activePanel === 'header' ? 'editing' : ''}`} onClick={() => { setActivePanel('header'); setEditingBlockId(null); setLeftTab('settings'); }}>
                   <div className="ub-block-drag" style={{ visibility: 'hidden' }}><GripVertical size={14} /></div>
                   <div className="ub-block-info">
                     <span className="ub-block-title" style={{ color: 'var(--primary)' }}>Global Header</span>
                     <span className="ub-block-desc">Appears on all pages</span>
                   </div>
                   <div className="ub-block-actions" style={{ opacity: 1 }}>
                     <button className="ub-block-action-btn" title="Toggling global elements per-page coming soon"><Eye size={14} /></button>
                   </div>
                </div>

                {blocks.map((block, i) => (
                  <div key={block.id}>
                    {dragTargetIndex === i && dragPosition === 'above' && <div className="ub-drop-indicator" />}
                    <div 
                      className={`ub-block-item ${editingBlockId === block.id ? 'editing' : ''}`}
                      onClick={() => { setEditingBlockId(block.id); setActivePanel(null); }}
                      draggable
                      onDragStart={(e) => handleBlockDragStart(e, i)}
                      onDragEnd={handleBlockDragEnd}
                      onDragOver={(e) => handleBlockDragOver(e, i)}
                      onDrop={(e) => handleBlockDrop(e, i)}
                    >
                      <div className="ub-block-drag" style={{ cursor: 'grab' }}><GripVertical size={14} /></div>
                      <div className="ub-block-info">
                        <span className="ub-block-title">{getBlockLabel(block.type)}</span>
                        <span className="ub-block-desc">{getBlockSummary(block)}</span>
                      </div>
                      <div className="ub-block-actions">
                        <button className="ub-block-action-btn danger" onClick={(e) => removeBlock(block.id, e)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                    {dragTargetIndex === i && dragPosition === 'below' && <div className="ub-drop-indicator" />}
                  </div>
                ))}

                {/* Global Footer pinned to bottom */}
                <div className={`ub-block-item ${activePanel === 'footer' ? 'editing' : ''}`} onClick={() => { setActivePanel('footer'); setEditingBlockId(null); setLeftTab('settings'); }}>
                   <div className="ub-block-drag" style={{ visibility: 'hidden' }}><GripVertical size={14} /></div>
                   <div className="ub-block-info">
                     <span className="ub-block-title" style={{ color: 'var(--primary)' }}>Global Footer</span>
                     <span className="ub-block-desc">Appears on all pages</span>
                   </div>
                   <div className="ub-block-actions" style={{ opacity: 1 }}>
                     <button className="ub-block-action-btn" title="Toggling global elements per-page coming soon"><Eye size={14} /></button>
                   </div>
                </div>
              </div>
            </div>
          )}

          {leftTab === 'settings' && (
            <div className="ub-settings-list">
              {SETTINGS_PANELS.map(panel => {
                const Icon = panel.icon;
                return (
                  <div 
                    key={panel.key}
                    className={`ub-setting-item ${activePanel === panel.key ? 'active' : ''}`}
                    onClick={() => { setActivePanel(panel.key); setEditingBlockId(null); }}
                  >
                    <Icon size={16} />
                    <span>{panel.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── CENTER NATIVE CANVAS ─── */}
      <div className="ub-center-canvas">
        <div className="ub-canvas-topbar" style={{ flexShrink: 0 }}>
          <div className="ub-canvas-controls">
            <div className="ub-page-selector" style={{ margin: 0, width: '200px' }}>
              <select value={selectedPage?.id || ''} onChange={(e) => selectPage(e.target.value)} style={{ padding: '6px 10px' }}>
                {pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div className="ub-device-toggles">
              <button className={`ub-device-btn ${previewMode === 'desktop' ? 'active' : ''}`} onClick={() => setPreviewMode('desktop')}><Monitor size={16} /></button>
              <button className={`ub-device-btn ${previewMode === 'mobile' ? 'active' : ''}`} onClick={() => setPreviewMode('mobile')}><Smartphone size={16} /></button>
            </div>
          </div>
          <div className="ub-canvas-actions">
            {hasChanges && <span className="ub-unsaved-badge">Unsaved changes</span>}
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !hasChanges}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        
        <div className="ub-canvas-scroll">
          <div className={`ub-canvas-body ${previewMode}`}>
            <StoreConfigContext.Provider value={{ config: draftConfig as StoreConfig, loading: false, formatPrice: (p) => `${draftConfig.currency_symbol || '£'}${Number(p).toFixed(2)}` }}>
              <div 
                className="sf-builder-mock-container"
                onDragOver={e => { e.preventDefault(); if (blocks.length === 0) setIsCanvasDragOver(true); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsCanvasDragOver(false); }}
              >
                
                {/* Global Announcement bar */}
                {showAnnouncement && (
                  <div 
                    className={`sf-announcement sf-builder-global ${activePanel === 'header' ? 'editing' : ''}`} 
                    style={{ backgroundColor: annBg, color: annColor, fontFamily: annFont }}
                    onClick={() => { setActivePanel('header'); setEditingBlockId(null); setLeftTab('settings'); }}
                  >
                    {isTicker ? (
                      <div className="sf-announcement-ticker-wrap">
                        <div className="sf-marquee" style={{ gap: `${tickerSpacing}px`, paddingRight: `${tickerSpacing}px`, animationDuration: `${tickerSpeed}s` }}>
                          {repeatedContent.map((msg, i) => <span key={i}>{msg}</span>)}
                        </div>
                        <div className="sf-marquee" style={{ gap: `${tickerSpacing}px`, paddingRight: `${tickerSpacing}px`, animationDuration: `${tickerSpeed}s` }}>
                          {repeatedContent.map((msg, i) => <span key={`dup-${i}`}>{msg}</span>)}
                        </div>
                      </div>
                    ) : (
                      draftConfig.announcement_bar_text
                    )}
                  </div>
                )}

                {/* Global Header */}
                <header 
                   className={`sf-header logo-${headerLayout.logo_position || 'left'} sf-builder-global ${activePanel === 'header' ? 'editing' : ''}`} 
                   style={{ backgroundColor: hBg, color: hColor, fontFamily: hFont }}
                   onClick={() => { setActivePanel('header'); setEditingBlockId(null); setLeftTab('settings'); }}
                >
                  <div className="sf-header-inner">
                    <button className="sf-mobile-menu-btn" style={{ color: hColor }}><Menu size={24} /></button>
                    <div className="sf-logo" style={{ pointerEvents: 'none' }}>
                      {draftConfig?.logo_url ? (
                        <img src={draftConfig.logo_url} alt={draftConfig.store_name} className="sf-logo-img" />
                      ) : (
                        <span className="sf-logo-text" style={{ color: hColor }}>{draftConfig?.store_name || 'Store'}</span>
                      )}
                    </div>
                    <nav className="sf-nav" style={{ pointerEvents: 'none' }}>
                      <span className="sf-nav-link" style={{ color: hColor }}>Home</span>
                      <span className="sf-nav-link" style={{ color: hColor }}>Products</span>
                      <span className="sf-nav-link" style={{ color: hColor }}>Collections</span>
                      {navLinks.map((link: any, i: number) => (
                         <span key={i} className="sf-nav-link" style={{ color: hColor }}>{link.label}</span>
                      ))}
                    </nav>
                    <button className="sf-cart-btn" style={{ color: cartIconColor }}><CartIconCmp size={22} /></button>
                  </div>
                </header>

                {/* Page Blocks Area */}
                <main className="sf-main" style={{ minHeight: '400px', backgroundColor: 'var(--sf-bg)' }}>
                  {blocks.length === 0 ? (
                    <div className={`ub-canvas-empty${isCanvasDragOver ? ' drag-over' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); e.stopPropagation(); handleCanvasDrop(e); }}>
                      <div className="ub-canvas-empty-text">Drag blocks here from the Library to build your page.</div>
                    </div>
                  ) : (
                    <div className="ub-native-blocks-wrapper">
                      {blocks.map((block, idx) => (
                        <div key={block.id}>
                          {dragTargetIndex === idx && dragPosition === 'above' && <div className="ub-preview-drop-indicator" />}
                          <div
                            className={`ub-preview-block ${editingBlockId === block.id ? 'editing' : ''} ${dragSrcRef.current === idx ? 'dragging' : ''}`}
                            data-block-label={getBlockLabel(block.type).toUpperCase()}
                            onClick={(e) => { e.stopPropagation(); setEditingBlockId(block.id); setActivePanel(null); }}
                            draggable
                            onDragStart={(e) => handleBlockDragStart(e, idx)}
                            onDragEnd={handleBlockDragEnd}
                            onDragOver={(e) => handleBlockDragOver(e, idx)}
                            onDrop={(e) => handleBlockDrop(e, idx)}
                          >
                            <div className="ub-preview-block-overlay">
                              <div className="ub-preview-block-handle" style={{ cursor: 'grab' }}><GripVertical size={16} /></div>
                              <div className="ub-preview-block-actions">
                                <button className="ub-preview-block-btn danger" onClick={(e) => removeBlock(block.id, e)}><Trash2 size={14} /></button>
                              </div>
                            </div>
                            <div style={{ pointerEvents: 'none' }}>
                              <BlockContent block={block} />
                            </div>
                          </div>
                          {dragTargetIndex === idx && dragPosition === 'below' && <div className="ub-preview-drop-indicator" />}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Drop zone explicitly at bottom for extra padding */}
                  <div style={{ height: 40 }} onDragOver={e => { e.preventDefault(); e.stopPropagation(); }} onDrop={e => { e.preventDefault(); e.stopPropagation(); const d = e.dataTransfer.getData('text/plain'); if (d && d !== '__reorder__') addBlock(d as BlockType); }} />
                </main>

                {/* Global Footer */}
                {(() => {
                  const fc: any = draftConfig?.footer_config || {};
                  const fBg = fc.bg_color || undefined;
                  const fColor = fc.text_color || undefined;
                  const fFont = fc.font ? `'${fc.font}', sans-serif` : undefined;
                  const fHeading = fc.heading_color || undefined;
                  const fLink = fc.link_color || undefined;
                  return (
                    <footer
                      className={`sf-footer sf-builder-global ${activePanel === 'footer' ? 'editing' : ''}`}
                      style={{ ...(fBg ? { backgroundColor: fBg } : {}), ...(fColor ? { color: fColor } : {}), ...(fFont ? { fontFamily: fFont } : {}) }}
                      onClick={() => { setActivePanel('footer'); setEditingBlockId(null); setLeftTab('settings'); }}
                    >
                      <div className="sf-footer-inner" style={{ pointerEvents: 'none' }}>
                        <div className="sf-footer-columns">
                          {(draftConfig?.footer_config?.columns || []).map((col, ci) => (
                            <div className="sf-footer-column" key={ci}>
                              <h4 style={fHeading ? { color: fHeading } : undefined}>{col.title}</h4>
                              {col.links.map((link, li) => (
                                <span key={li} className="sf-footer-link" style={fLink ? { color: fLink } : undefined}>{link.label}</span>
                              ))}
                            </div>
                          ))}
                        </div>
                        <div className="sf-footer-bottom">
                          <div className="sf-footer-social">
                            {(draftConfig?.footer_config?.social_links || []).map((link, i) => (
                              <span key={i} className="sf-social-link" title={link.platform}><SocialIcon platform={link.platform} size={18} /></span>
                            ))}
                          </div>
                          <p className="sf-copyright">
                            {draftConfig?.footer_config?.copyright || `© ${new Date().getFullYear()} ${draftConfig?.store_name}`}
                          </p>
                        </div>
                      </div>
                    </footer>
                  );
                })()}
              </div>
            </StoreConfigContext.Provider>
          </div>
        </div>
      </div>

      {/* ─── RIGHT SIDEBAR (If editing block or setting) ─── */}
      {(editingBlock || activePanel) && (
        <div className="ub-right-sidebar">
          {editingBlock && (
            <>
              <div className="ub-right-header">
                <h3>{getBlockLabel(editingBlock.type)}</h3>
                <button className="ub-close-btn" onClick={() => setEditingBlockId(null)}><X size={16} /></button>
              </div>
              <div className="ub-right-content">
                <BlockEditor 
                  block={editingBlock} 
                  onChange={(c) => updateBlockConfig(editingBlock.id, c)} 
                />
              </div>
            </>
          )}

          {activePanel && (
            <>
              <div className="ub-right-header">
                <h3>{SETTINGS_PANELS.find(p => p.key === activePanel)?.label} Settings</h3>
                <button className="ub-close-btn" onClick={() => setActivePanel(null)}><X size={16} /></button>
              </div>
              <div className="ub-right-content">
                <GlobalSettingsEditor panel={activePanel} draft={draftConfig} updateDraft={updateDraft} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───
function getBlockLabel(type: BlockType): string {
  const labels: Record<string, string> = {
    hero: 'Hero Banner', half_hero: 'Half Hero', heading: 'Heading', text: 'Text', image: 'Image',
    image_gallery: 'Image Gallery', button: 'Button', product_grid: 'Product Grid',
    collection_grid: 'Collection Grid', collection_showcase: 'Collection Showcase',
    category_links: 'Category Links', product_carousel: 'Product Carousel',
    featured_product: 'Featured Product', spacer: 'Spacer', divider: 'Divider', video: 'Video',
    testimonials: 'Testimonials', faq: 'FAQ', banner: 'Banner', ticker: 'Ticker Tape', features: 'Features Grid', custom_html: 'Custom HTML',
    columns: 'Columns Layout', container: 'Container Block',
  };
  return labels[type] || type;
}

function getBlockSummary(block: PageBlock): string {
  const c = block.config;
  switch (block.type) {
    case 'hero': return c.title || 'Untitled hero';
    case 'text': return c.text ? c.text.substring(0, 40) + '...' : 'Empty text';
    case 'ticker': return c.text || 'Ticker text';
    case 'features': return `${(c.items || []).length} features`;
    case 'image': return c.alt || 'Image';
    case 'columns': return `${c.columns?.length || 0} columns`;
    case 'container': return `${(c.blocks || []).length} inner blocks`;
    default: return 'Block configuration';
  }
}

function getDefaultConfig(type: BlockType): Record<string, any> {
  switch (type) {
    case 'hero': return { title: 'Welcome', subtitle: '', imageUrl: '', ctaText: 'Shop Now', ctaLink: '/shop/products', overlayOpacity: 0.4 };
    case 'half_hero': return { title: '', subtitle: '', imageUrl: '', ctaText: '', ctaLink: '', objectPosition: 'center', height: '600px' };
    case 'heading': return { text: 'Heading', level: 'h2', align: 'center' };
    case 'text': return { text: 'Enter your text here...', align: 'left' };
    case 'image': return { url: '', alt: '', width: '100%', align: 'center' };
    case 'image_gallery': return { images: [], columns: 3, gap: 16 };
    case 'button': return { text: 'Click Me', link: '', style: 'primary', align: 'center', size: 'md' };
    case 'product_grid': return { mode: 'auto', productIds: [], columns: 4, limit: 8 };
    case 'collection_grid': return { mode: 'auto', collectionIds: [], columns: 3 };
    case 'collection_showcase': return { title: 'INTRODUCING THE COLLECTION', subtitle: 'Built for a life in constant motion.', collectionId: '', limit: 5, showSwatches: true, ctaText: 'SHOP NOW', ctaLink: '/shop/products' };
    case 'category_links': return { items: [{ title: 'JACKETS', imageUrl: '', link: '' }, { title: 'TOPS', imageUrl: '', link: '' }, { title: 'BOTTOMS', imageUrl: '', link: '' }] };
    case 'product_carousel': return { title: 'BEST SELLERS', ctaText: 'SHOP NOW', ctaLink: '/shop/products', collectionId: '', limit: 10 };
    case 'featured_product': return { productId: '' };
    case 'spacer': return { height: 40 };
    case 'divider': return { style: 'solid', color: '#e5e7eb', thickness: 1 };
    case 'video': return { url: '', autoplay: false };
    case 'testimonials': return { items: [{ name: '', text: '', rating: 5 }] };
    case 'faq': return { items: [{ question: '', answer: '' }] };
    case 'banner': return { text: 'Banner text', bgColor: '#1a1a2e', textColor: '#ffffff', align: 'center' };
    case 'ticker': return { text: '📢 FREE SHIPPING ON ALL ORDERS', speed: 30, bgColor: '#000000', textColor: '#ffffff' };
    case 'features': return { items: [{ icon: 'check', title: 'Feature 1', description: 'Description here' }, { icon: 'check', title: 'Feature 2', description: 'Description here' }, { icon: 'check', title: 'Feature 3', description: 'Description here' }] };
    case 'custom_html': return { html: '' };
    case 'columns': return { columns: [[], []], gap: 16, stackOnMobile: true };
    case 'container': return { blocks: [], padding: '40px', bgColor: 'transparent', maxWidth: '1200px' };
    default: return {};
  }
}
