import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';

import * as api from '@/lib/api';
import type { Order, OrderItem } from '@/types/database';
import { ArrowLeft, Check, X, Plus, Minus, Camera, ChevronDown, ScanLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

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
  
  const [picked, setPicked] = useState<Record<string, number>>({});
  
  // Flash states
  const [flash, setFlash] = useState<'success' | 'error' | null>(null);
  const [flashVisible, setFlashVisible] = useState(false);

  // Workflow states
  const [workflowState, setWorkflowState] = useState<'setup' | 'picking' | 'done'>('setup');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scannedItems, setScannedItems] = useState<Record<string, boolean>>({});

  // Camera settings
  const [cameras, setCameras] = useState<{id: string, label: string}[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const latestRefs = useRef({ items, currentIndex, scannedItems, picked });
  const lastScannedTime = useRef(0);

  useEffect(() => {
    latestRefs.current = { items, currentIndex, scannedItems, picked };
  }, [items, currentIndex, scannedItems, picked]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.fetchOrder(id),
      api.fetchOrderItems(id),
    ])
      .then(([o, i]) => {
        setOrder(o);
        setItems(i);
        const initPicked: Record<string, number> = {};
        i.forEach(item => { initPicked[item.id] = 0; });
        setPicked(initPicked);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices);
        const back = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        setSelectedCamera(back ? back.id : devices[0].id);
      } else {
        setCameraError('No cameras found.');
      }
    }).catch(e => {
      console.warn("Could not get cameras", e);
      setCameraError('Please allow camera permissions.');
    });
  }, []);

  const playBeep = (isSuccess: boolean) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      
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

  const startScannerWrapper = () => {
    if (!selectedCamera) return;
    setWorkflowState('picking');
    setIsScanning(true);
  };

  const stopScannerWrapper = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.error("Error stopping scanner", e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (workflowState === 'picking' && isScanning && selectedCamera && items.length > 0) {
      // Need a timeout to ensure #reader is in the DOM
      const timer = setTimeout(() => {
        if (!document.getElementById('reader')) return;
        
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        
        html5QrCode.start(
          selectedCamera,
          { fps: 10, qrbox: { width: 250, height: 100 }, aspectRatio: 2.0 },
          (decodedText) => {
            if (Date.now() - lastScannedTime.current < 1500) return;

            const refs = latestRefs.current;
            const matchedIndex = refs.items.findIndex(i => i.barcode === decodedText || i.sku === decodedText);

            if (matchedIndex === -1) {
              lastScannedTime.current = Date.now();
              showFlash('error');
              return;
            }

            lastScannedTime.current = Date.now();

            if (matchedIndex === refs.currentIndex) {
              const currentItem = refs.items[refs.currentIndex];
              if (!refs.scannedItems[currentItem.id]) {
                showFlash('success');
                setScannedItems(prev => ({ ...prev, [currentItem.id]: true }));
                setPicked(prev => ({ ...prev, [currentItem.id]: Math.max(prev[currentItem.id] || 0, 1) }));
              } else {
                if (navigator.vibrate) navigator.vibrate(50);
              }
            } else {
              showFlash('success');
              setCurrentIndex(matchedIndex);
              const matchedItem = refs.items[matchedIndex];
              setScannedItems(prev => ({ ...prev, [matchedItem.id]: true }));
              setPicked(prev => ({ ...prev, [matchedItem.id]: Math.max(prev[matchedItem.id] || 0, 1) }));
            }
          },
          () => {} // Ignore scan errors
        ).catch(err => {
          console.error("Error starting camera", err);
          setIsScanning(false);
          setCameraError("Failed to start camera. Please check permissions.");
        });
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
          }).catch(() => {});
          scannerRef.current = null;
        }
      };
    }
  }, [workflowState, isScanning, selectedCamera, items.length]);

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

  const isFullyPicked = items.length > 0 && items.every(item => (picked[item.id] || 0) >= item.quantity);

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(c => c + 1);
    } else if (!isFullyPicked) {
      const firstMissing = items.findIndex(item => (picked[item.id] || 0) < item.quantity);
      if (firstMissing !== -1) setCurrentIndex(firstMissing);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(c => c - 1);
  };

  const handleFinishPicking = async () => {
    await stopScannerWrapper();
    setWorkflowState('done');
  };

  const handleRestartPicking = () => {
    setWorkflowState('setup');
  };

  if (loading) return <PageShell title="Order Picking"><div className="store-loading">Loading order items...</div></PageShell>;
  if (!order) return <PageShell title="Order Picking"><div className="store-loading">Order not found.</div></PageShell>;

  const currentItem = items[currentIndex];
  const isScanned = currentItem ? scannedItems[currentItem.id] : false;
  const pickedQty = currentItem ? (picked[currentItem.id] || 0) : 0;

  return (
    <div className="order-picking-layout">
      <ScanFlash type={flash} visible={flashVisible} onHide={() => setFlashVisible(false)} />
      
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link to={`/orders/${order.id}`} className="btn btn-ghost btn-icon-sm" style={{ padding: 0 }}>
          <ArrowLeft size={20} />
        </Link>
        <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>Order #{order.order_number}</div>
        <div style={{ padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, backgroundColor: workflowState === 'done' ? '#d1fae5' : '#fee2e2', color: workflowState === 'done' ? '#059669' : '#dc2626' }}>
          {workflowState === 'done' ? 'PICKED' : 'PICKING'}
        </div>
      </header>

      <div style={{ padding: '0.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        
        {workflowState === 'setup' && (
          <div style={{ background: '#fff', borderRadius: '1.5rem', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 400, margin: '2rem auto' }}>
            <div style={{ width: 64, height: 64, background: '#eff6ff', color: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Camera size={32} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem' }}>Select Camera</h2>
            
            <div style={{ width: '100%', marginBottom: '1.5rem', position: 'relative' }}>
               <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', marginBottom: '0.5rem' }}>Available Cameras</label>
               <select 
                 value={selectedCamera}
                 onChange={e => setSelectedCamera(e.target.value)}
                 style={{ width: '100%', appearance: 'none', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.75rem', padding: '0.875rem 1rem', fontSize: '1rem', color: '#0f172a', outline: 'none', cursor: 'pointer' }}
               >
                  {cameras.length === 0 && <option value="">Loading...</option>}
                  {cameras.map(c => <option key={c.id} value={c.id}>{c.label || `Camera ${c.id.substring(0, 5)}`}</option>)}
               </select>
               <div style={{ position: 'absolute', right: '1rem', bottom: '1rem', pointerEvents: 'none', color: '#94a3b8' }}>
                  <ChevronDown size={20} />
               </div>
               {cameraError && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'center' }}>{cameraError}</p>}
            </div>

            <button 
              onClick={startScannerWrapper} 
              disabled={!selectedCamera || items.length === 0}
              style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: '1rem', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: 600, cursor: (!selectedCamera || items.length === 0) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)', transition: 'all 0.2s', opacity: (!selectedCamera || items.length === 0) ? 0.5 : 1 }}
            >
               Start Picking
            </button>
          </div>
        )}

        {(workflowState === 'picking' && currentItem) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minHeight: 0 }}>
            {/* Scanner View */}
            {isScanning && (
              <div style={{ width: '100%', maxHeight: '40vh', minHeight: '180px', borderRadius: '1rem', overflow: 'hidden', background: '#0f172a', position: 'relative', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div id="reader" style={{ width: '100%', minWidth: '300px' }}></div>
              </div>
            )}

            {/* Current Item Card */}
            <div style={{ background: '#fff', borderRadius: '1rem', padding: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                     Item {currentIndex + 1} of {items.length}
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '0.5rem' }}>
                     Expected: {currentItem.quantity}
                  </span>
               </div>

               <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                  {currentItem.product_name}
               </h3>
               {(currentItem.variant_label || currentItem.sku || currentItem.barcode) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                     {currentItem.variant_label && <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>{currentItem.variant_label}</span>}
                     {currentItem.sku && <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>SKU: {currentItem.sku}</span>}
                     {currentItem.barcode && <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>BC: {currentItem.barcode}</span>}
                  </div>
               )}

               {!isScanned ? (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', margin: 'auto 0' }}>
                      <ScanLine size={24} color="#3b82f6" style={{ opacity: 0.9 }} />
                      <p style={{ color: '#1e3a8a', fontSize: '0.875rem', fontWeight: 600, margin: 0, textAlign: 'center' }}>Scan item barcode to verify</p>
                  </div>
               ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 'auto 0', animation: 'fadeIn 0.3s ease-out' }}>
                     <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmed Picked Quantity</p>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                        <button onClick={() => handleManualRemove(currentItem.id)} disabled={pickedQty <= 0} style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: pickedQty <= 0 ? 'not-allowed' : 'pointer', opacity: pickedQty <= 0 ? 0.5 : 1, transition: 'all 0.1s' }}>
                           <Minus size={24} />
                        </button>
                        <span style={{ fontSize: '3rem', fontWeight: 800, color: '#0f172a', width: 64, textAlign: 'center', lineHeight: 1 }}>
                           {pickedQty}
                        </span>
                        <button onClick={() => handleManualAdd(currentItem.id, currentItem.quantity)} disabled={pickedQty >= currentItem.quantity} style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', cursor: pickedQty >= currentItem.quantity ? 'not-allowed' : 'pointer', opacity: pickedQty >= currentItem.quantity ? 0.5 : 1, transition: 'all 0.1s' }}>
                           <Plus size={24} />
                        </button>
                     </div>
                  </div>
               )}

               {isScanned ? (
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                     <button onClick={handlePrev} disabled={currentIndex === 0} style={{ flex: 1, padding: '0.75rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: 600, color: '#475569', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentIndex === 0 ? 0.5 : 1, transition: 'all 0.1s' }}>
                        Previous
                     </button>
                     
                     {(currentIndex === items.length - 1 && isFullyPicked) ? (
                        <button onClick={handleFinishPicking} style={{ flex: 2, padding: '0.75rem', background: '#10b981', border: 'none', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: 600, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)', transition: 'all 0.1s' }}>
                           <Check size={20} /> Finish Picking
                        </button>
                     ) : (
                        <button onClick={handleNext} style={{ flex: 2, padding: '0.75rem', background: '#2563eb', border: 'none', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: 600, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)', transition: 'all 0.1s' }}>
                           {(!isFullyPicked && currentIndex === items.length - 1) ? 'Find Missing' : 'Next Item'}
                        </button>
                     )}
                  </div>
               ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                     <button onClick={handlePrev} disabled={currentIndex === 0} style={{ background: 'none', border: 'none', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentIndex === 0 ? 0.3 : 1 }}>
                        ← Prev Item
                     </button>
                     <button onClick={handleNext} disabled={currentIndex === items.length - 1} style={{ background: 'none', border: 'none', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', cursor: currentIndex === items.length - 1 ? 'not-allowed' : 'pointer', opacity: currentIndex === items.length - 1 ? 0.3 : 1 }}>
                        Skip to Next →
                     </button>
                  </div>
               )}
            </div>
          </div>
        )}

        {workflowState === 'done' && (
          <div style={{ background: '#fff', borderRadius: '1.5rem', padding: '3rem 2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%', maxWidth: 400, margin: '2rem auto' }}>
            <div style={{ width: 80, height: 80, background: '#d1fae5', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Check size={40} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>All Items Picked!</h2>
            <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '2rem' }}>Order #{order.order_number} is ready for packing and shipping.</p>

            <button disabled style={{ width: '100%', background: '#10b981', color: '#fff', border: 'none', padding: '1rem', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>
               <Check size={20} /> PICKED
            </button>
            <button onClick={handleRestartPicking} style={{ marginTop: '1rem', background: 'none', border: 'none', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
               Review Picking
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
