import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ShoppingBag, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import './OrderNotifications.css';

interface OrderNotification {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  created_at: string;
  read: boolean;
}

// Notification sound — short, pleasant chime using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(830, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second tone (higher, slight delay)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046, now + 0.15);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.12, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);
  } catch (_e) {
    // Silent fail — audio not available
  }
}

export function OrderNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState<OrderNotification | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close panel on outside click
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen]);

  // Show toast with auto-dismiss
  const showToast = useCallback((notif: OrderNotification) => {
    setToast(notif);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 8000);
  }, []);

  // Subscribe to Supabase Realtime for new paid orders
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: 'status=eq.paid',
        },
        (payload) => {
          const order = payload.new as any;
          // Only trigger for orders that just became 'paid' (check the old record wasn't already paid)
          const oldStatus = (payload.old as any)?.status;
          if (oldStatus === 'paid') return; // Already was paid, skip

          const notif: OrderNotification = {
            id: order.id,
            order_number: order.order_number || order.id.slice(0, 8).toUpperCase(),
            customer_name: order.customer_name || 'Customer',
            total: Number(order.total || 0),
            created_at: order.updated_at || new Date().toISOString(),
            read: false,
          };

          setNotifications(prev => [notif, ...prev].slice(0, 20)); // Keep last 20
          showToast(notif);
          playNotificationSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showToast]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotifClick = (notif: OrderNotification) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notif.id ? { ...n, read: true } : n))
    );
    setPanelOpen(false);
    navigate(`/orders/${notif.id}`);
  };

  const handleToastClick = () => {
    if (toast) {
      handleNotifClick(toast);
      setToast(null);
    }
  };

  const dismissToast = (e: React.MouseEvent) => {
    e.stopPropagation();
    setToast(null);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      {/* Bell button */}
      <div className="order-notif-wrap" ref={panelRef}>
        <button
          className="top-header-icon-btn"
          onClick={() => setPanelOpen(!panelOpen)}
          title="Order Notifications"
          id="order-notifications-bell"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="notification-dot" />
          )}
        </button>

        {/* Dropdown panel */}
        {panelOpen && (
          <div className="order-notif-panel">
            <div className="order-notif-panel-header">
              <span className="order-notif-panel-title">New Orders</span>
              {unreadCount > 0 && (
                <button className="order-notif-mark-read" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>

            <div className="order-notif-panel-body">
              {notifications.length === 0 ? (
                <div className="order-notif-empty">
                  <ShoppingBag size={24} strokeWidth={1.5} />
                  <p>No new orders yet</p>
                  <span>Orders will appear here in real-time</span>
                </div>
              ) : (
                notifications.map(notif => (
                  <button
                    key={notif.id}
                    className={`order-notif-item ${!notif.read ? 'unread' : ''}`}
                    onClick={() => handleNotifClick(notif)}
                  >
                    <div className="order-notif-item-icon">
                      <ShoppingBag size={16} />
                    </div>
                    <div className="order-notif-item-content">
                      <div className="order-notif-item-top">
                        <span className="order-notif-item-order">#{notif.order_number}</span>
                        <span className="order-notif-item-total">£{notif.total.toFixed(2)}</span>
                      </div>
                      <div className="order-notif-item-bottom">
                        <span className="order-notif-item-customer">{notif.customer_name}</span>
                        <span className="order-notif-item-time">{formatTime(notif.created_at)}</span>
                      </div>
                    </div>
                    {!notif.read && <div className="order-notif-item-dot" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="order-toast" onClick={handleToastClick}>
          <div className="order-toast-icon">
            <ShoppingBag size={20} />
          </div>
          <div className="order-toast-content">
            <div className="order-toast-title">New Order Received</div>
            <div className="order-toast-detail">
              <span>#{toast.order_number}</span>
              <span className="order-toast-sep">•</span>
              <span>{toast.customer_name}</span>
              <span className="order-toast-sep">•</span>
              <span className="order-toast-total">£{toast.total.toFixed(2)}</span>
            </div>
          </div>
          <button className="order-toast-close" onClick={dismissToast}>
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
