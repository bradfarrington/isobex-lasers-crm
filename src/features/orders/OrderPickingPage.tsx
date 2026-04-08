import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';

import * as api from '@/lib/api';
import type { Order, OrderItem } from '@/types/database';
import { ArrowLeft, Check, X, Box, Plus, Minus } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

// A simple overlay to show big green check or red X
function ScanFlash({ type, visible, onHide }: { type: 'success' | 'error' | null, visible: boolean, onHide: () => void }) {
  useEffect(() => {
    if (visible) {
      if (type === 'error' && navigator.vibrate) navigator.vibrate([200, 100, 200]);
      else if (type === 'success' && navigator.vibrate) navigator.vibrate(100);
      const t = setTimeout(onHide, 1500);
      return () => clearTimeout(t);
    }
  }, [visible, type, onHide]);

  if (!visible || !type) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {type === 'success' ? <Check size={120} color="#fff" /> : <X size={120} color="#fff" />}
    </div>
  );
}

export function OrderPickingPage() {
  const { id } = useParams<{ id: string }>();

  
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track how many of each item have been picked
  const [picked, setPicked] = useState<Record<string, number>>({});
  
  // Flash states
  const [flash, setFlash] = useState<'success' | 'error' | null>(null);
  const [flashVisible, setFlashVisible] = useState(false);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.fetchOrder(id),
      api.fetchOrderItems(id),
    ])
      .then(([o, i]) => {
        setOrder(o);
        setItems(i);
        // Initialize picked counts to 0
        const initPicked: Record<string, number> = {};
        i.forEach(item => { initPicked[item.id] = 0; });
        setPicked(initPicked);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (loading) return;

    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 100 }, aspectRatio: 1.0 },
      /* verbose= */ false
    );

    scannerRef.current = scanner;

    scanner.render((decodedText) => {
      handleScan(decodedText);
    }, () => {
      // ignore frame errors
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, items]); // Re-bind handleScan with current items context

  const playBeep = (isSuccess: boolean) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isSuccess) {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.type = 'square';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {}
  };

  const showFlash = (type: 'success' | 'error') => {
    setFlash(type);
    setFlashVisible(true);
    playBeep(type === 'success');
  };

  // Keep track of last scan to prevent rapid bouncing
  const lastScannedTime = useRef(0);

  const handleScan = (barcode: string) => {
    if (Date.now() - lastScannedTime.current < 1500) return; // Debounce fast scans
    lastScannedTime.current = Date.now();

    const matchingItem = items.find(i => i.barcode === barcode || i.sku === barcode);

    if (!matchingItem) {
      showFlash('error');
      return;
    }

    setPicked(prev => {
      const currentCount = prev[matchingItem.id] || 0;
      if (currentCount >= matchingItem.quantity) {
        showFlash('error'); // Already picked enough
        return prev;
      }
      showFlash('success');
      return { ...prev, [matchingItem.id]: currentCount + 1 };
    });
  };

  const handleManualAdd = (itemId: string, maxQty: number) => {
    setPicked(prev => {
      const current = prev[itemId] || 0;
      if (current >= maxQty) return prev;
      return { ...prev, [itemId]: current + 1 };
    });
  };

  const handleManualRemove = (itemId: string) => {
    setPicked(prev => {
      const current = prev[itemId] || 0;
      if (current <= 0) return prev;
      return { ...prev, [itemId]: current - 1 };
    });
  };

  if (loading) return <PageShell title="Order Picking"><div className="store-loading">Loading order items...</div></PageShell>;
  if (!order) return <PageShell title="Order Picking"><div className="store-loading">Order not found.</div></PageShell>;

  const isFullyPicked = items.every(item => (picked[item.id] || 0) >= item.quantity);

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ScanFlash type={flash} visible={flashVisible} onHide={() => setFlashVisible(false)} />
      
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link to={`/orders/${order.id}`} className="btn btn-ghost btn-icon-sm" style={{ padding: 0 }}>
          <ArrowLeft size={20} />
        </Link>
        <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>Order #{order.order_number}</div>
        <div style={{ padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, backgroundColor: isFullyPicked ? '#d1fae5' : '#fee2e2', color: isFullyPicked ? '#059669' : '#dc2626' }}>
          {isFullyPicked ? 'READY' : 'PICKING'}
        </div>
      </header>

      <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Scanner Container */}
        <div style={{ background: '#fff', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div id="reader" style={{ width: '100%', minHeight: '200px', border: 'none' }}></div>
        </div>

        {/* Packing List */}
        <div style={{ background: '#fff', borderRadius: '1rem', padding: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', flex: 1 }}>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', color: '#0f172a' }}>
            <Box size={20} /> Items to Pack
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {items.map(item => {
              const qtyPicked = picked[item.id] || 0;
              const isDone = qtyPicked >= item.quantity;
              
              return (
                <div key={item.id} style={{ 
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', 
                  borderRadius: '0.75rem', border: '1px solid',
                  borderColor: isDone ? '#a7f3d0' : '#e2e8f0',
                  backgroundColor: isDone ? '#ecfdf5' : '#fff',
                  transition: 'all 0.2s',
                  opacity: isDone ? 0.7 : 1
                }}>
                  
                  {/* Status indicator */}
                  <div style={{ 
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    backgroundColor: isDone ? '#10b981' : '#f1f5f9',
                    color: isDone ? '#fff' : '#94a3b8'
                  }}>
                    {isDone ? <Check size={16} /> : <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.quantity}</span>}
                  </div>
                  
                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product_name}
                    </div>
                    {(item.variant_label || item.barcode || item.sku) && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 4 }}>
                        {item.variant_label && <span>{item.variant_label}</span>}
                        {item.barcode && <span>BC: {item.barcode}</span>}
                        {(!item.barcode && item.sku) && <span>SKU: {item.sku}</span>}
                      </div>
                    )}
                  </div>
                  
                  {/* Manual controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <button 
                      onClick={() => handleManualRemove(item.id)}
                      disabled={qtyPicked === 0}
                      style={{ width: 32, height: 32, borderRadius: '0.5rem', border: '1px solid #cbd5e1', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: qtyPicked === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      <Minus size={14} />
                    </button>
                    <div style={{ width: '2rem', textAlign: 'center', fontWeight: 700, fontSize: '1.25rem', color: isDone ? '#059669' : '#0f172a' }}>
                      {qtyPicked}
                    </div>
                    <button 
                      onClick={() => handleManualAdd(item.id, item.quantity)}
                      disabled={isDone}
                      style={{ width: 32, height: 32, borderRadius: '0.5rem', border: '1px solid #10b981', background: isDone ? '#f1f5f9' : '#ecfdf5', borderColor: isDone ? '#cbd5e1' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDone ? '#94a3b8' : '#10b981', cursor: isDone ? 'not-allowed' : 'pointer' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
