import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { useAlert } from '@/components/ui/AlertDialog';
import * as api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Order, OrderItem } from '@/types/database';
import { ArrowLeft, Package, User, MapPin, Truck, Building, Printer, ExternalLink, Save, RotateCcw, Mail, Loader2 } from 'lucide-react';



const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'partially_refunded'] as const;
const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded', 'partially_refunded', 'failed'] as const;

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showAlert, showConfirm } = useAlert();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [shippingCarrier, setShippingCarrier] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [trackingSaving, setTrackingSaving] = useState(false);

  const packingSlipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.fetchOrder(id),
      api.fetchOrderItems(id),
    ])
      .then(([o, i]) => {
        setOrder(o);
        setItems(i);
        setTrackingNumber(o.tracking_number || '');
        setTrackingUrl(o.tracking_url || '');
        setShippingCarrier(o.shipping_carrier || '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (status: Order['status']) => {
    if (!order) return;
    try {
      const updated = await api.updateOrderStatus(order.id, status);
      setOrder(updated);
      showAlert({ title: 'Updated', message: `Order status changed to ${status}.`, variant: 'success' });
    } catch {
      showAlert({ title: 'Error', message: 'Failed to update order status.', variant: 'danger' });
    }
  };

  const handlePaymentChange = async (paymentStatus: Order['payment_status']) => {
    if (!order) return;
    try {
      const updated = await api.updateOrderStatus(order.id, order.status, paymentStatus);
      setOrder(updated);
      showAlert({ title: 'Updated', message: `Payment status changed to ${paymentStatus}.`, variant: 'success' });
    } catch {
      showAlert({ title: 'Error', message: 'Failed to update payment status.', variant: 'danger' });
    }
  };

  const handleSaveTracking = async () => {
    if (!order) return;
    setTrackingSaving(true);
    try {
      const updated = await api.updateOrderTracking(
        order.id,
        trackingNumber.trim() || null,
        trackingUrl.trim() || null,
        shippingCarrier.trim() || null
      );
      setOrder(updated);
      showAlert({ title: 'Saved', message: 'Tracking information updated.', variant: 'success' });
    } catch {
      showAlert({ title: 'Error', message: 'Failed to save tracking info.', variant: 'danger' });
    } finally {
      setTrackingSaving(false);
    }
  };

  const handleRefund = async () => {
    if (!order || !order.payment_intent_id) return;
    const ok = await showConfirm({
      title: 'Issue Refund',
      message: `Are you sure you want to refund this order (£${Number(order.total).toFixed(2)})? This will refund the customer via Stripe and restore inventory.`,
      confirmLabel: 'Issue Refund',
    });
    if (!ok) return;

    setRefunding(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-refund', {
        body: { orderId: order.id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Refund failed');
      const updated = await api.fetchOrder(order.id);
      setOrder(updated);
      showAlert({ title: 'Refunded', message: 'Refund processed successfully. Inventory has been restored.', variant: 'success' });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err?.message || 'Failed to process refund.', variant: 'danger' });
    } finally {
      setRefunding(false);
    }
  };

  const handleSendEmail = async (action: string, label: string) => {
    if (!order) return;
    setSendingEmail(action);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { action, orderId: order.id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Failed to send email');
      showAlert({ title: 'Sent', message: `${label} sent to ${data?.sentTo || order.customer_email}.`, variant: 'success' });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err?.message || `Failed to send ${label.toLowerCase()}.`, variant: 'danger' });
    } finally {
      setSendingEmail(null);
    }
  };

  const handlePrintPackingSlip = () => {
    if (!packingSlipRef.current || !order) return;

    const shippingAddr = order.shipping_address as any;
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Packing Slip — Order #${order.order_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #111; font-size: 14px; }
          .slip-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #111; }
          .slip-company { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
          .slip-company-sub { font-size: 11px; color: #666; margin-top: 4px; }
          .slip-order-info { text-align: right; }
          .slip-order-number { font-size: 18px; font-weight: 700; }
          .slip-order-date { font-size: 12px; color: #666; margin-top: 4px; }
          .slip-addresses { display: flex; gap: 48px; margin-bottom: 32px; }
          .slip-addr-block { flex: 1; }
          .slip-addr-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin-bottom: 8px; }
          .slip-addr-content { font-size: 13px; line-height: 1.6; }
          .slip-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .slip-table th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #666; padding: 10px 12px; border-bottom: 1px solid #ddd; }
          .slip-table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
          .slip-table .col-qty { text-align: center; width: 60px; }
          .slip-table .col-price { text-align: right; width: 80px; }
          .slip-totals { display: flex; justify-content: flex-end; }
          .slip-totals-box { width: 240px; }
          .slip-totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
          .slip-totals-row.total { font-weight: 700; font-size: 15px; padding-top: 12px; margin-top: 8px; border-top: 2px solid #111; }
          .slip-totals-row.discount { color: #22854a; }
          .slip-tracking { margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .slip-footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #999; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="slip-header">
          <div>
            <div class="slip-company">ISOBEX LASERS</div>
            <div class="slip-company-sub">Laser Parts &amp; Consumables</div>
          </div>
          <div class="slip-order-info">
            <div class="slip-order-number">Order #${order.order_number}</div>
            <div class="slip-order-date">${new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>

        <div class="slip-addresses">
          <div class="slip-addr-block">
            <div class="slip-addr-label">Bill To</div>
            <div class="slip-addr-content">
              <strong>${order.customer_name}</strong><br>
              ${order.customer_email}<br>
              ${order.customer_phone || ''}
            </div>
          </div>
          ${shippingAddr ? `
          <div class="slip-addr-block">
            <div class="slip-addr-label">Ship To</div>
            <div class="slip-addr-content">
              <strong>${order.customer_name}</strong><br>
              ${shippingAddr.line1 || ''}<br>
              ${shippingAddr.line2 ? shippingAddr.line2 + '<br>' : ''}
              ${shippingAddr.city || ''}${shippingAddr.county ? ', ' + shippingAddr.county : ''}<br>
              ${shippingAddr.postcode || ''}<br>
              ${shippingAddr.country || ''}
            </div>
          </div>
          ` : ''}
        </div>

        <table class="slip-table">
          <thead>
            <tr>
              <th>Item</th>
              <th class="col-qty">Qty</th>
              <th class="col-price">Price</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>
                  <strong>${item.product_name}</strong>
                  ${item.variant_label ? '<br><span style="color:#666;font-size:12px;">Variant: ' + item.variant_label + '</span>' : ''}
                  ${item.sku ? '<br><span style="color:#666;font-size:11px;">SKU: ' + item.sku + '</span>' : ''}
                </td>
                <td class="col-qty">${item.quantity}</td>
                <td class="col-price">£${Number(item.total_price).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="slip-totals">
          <div class="slip-totals-box">
            <div class="slip-totals-row"><span>Subtotal</span><span>£${Number(order.subtotal).toFixed(2)}</span></div>
            ${Number(order.discount_amount) > 0 ? `<div class="slip-totals-row discount"><span>Discount (${order.discount_code || ''})</span><span>−£${Number(order.discount_amount).toFixed(2)}</span></div>` : ''}
            ${Number(order.tax_amount) > 0 ? `<div class="slip-totals-row"><span>VAT</span><span>£${Number(order.tax_amount).toFixed(2)}</span></div>` : ''}
            <div class="slip-totals-row"><span>Shipping</span><span>£${Number(order.shipping_cost).toFixed(2)}</span></div>
            <div class="slip-totals-row total"><span>Total</span><span>£${Number(order.total).toFixed(2)}</span></div>
          </div>
        </div>

        ${order.tracking_number ? `
        <div class="slip-tracking">
          <strong>Tracking:</strong> ${order.tracking_number}
          ${order.tracking_url ? ' — <a href="' + order.tracking_url + '">' + order.tracking_url + '</a>' : ''}
        </div>
        ` : ''}

        <div class="slip-footer">
          Thank you for your order — Isobex Lasers
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <PageShell title="Order"><div className="store-loading">Loading order...</div></PageShell>;
  if (!order) return <PageShell title="Order"><div className="store-loading">Order not found.</div></PageShell>;

  const shippingAddr = order.shipping_address as any;
  const hasTrackingChanges =
    (trackingNumber.trim() || '') !== (order.tracking_number || '') ||
    (trackingUrl.trim() || '') !== (order.tracking_url || '') ||
    (shippingCarrier.trim() || '') !== (order.shipping_carrier || '');

  const isTestOrder = order.notes?.includes('[TEST ORDER]') || false;

  const handleTestRefund = async () => {
    const ok = await showConfirm({
      title: 'Test Refund',
      message: 'This is a test order — no real money will be refunded and inventory will not change. Mark this order as refunded?',
      confirmLabel: 'Refund Test Order',
    });
    if (!ok) return;
    setRefunding(true);
    try {
      // Just update statuses directly — no Stripe call, no inventory change
      await api.updateOrderStatus(order.id, 'refunded', 'refunded');
      // Send refund confirmation email + SMS
      try {
        await supabase.functions.invoke('send-email', {
          body: { action: 'send_refund_confirmation', orderId: order.id },
        });
      } catch {}
      try {
        await supabase.functions.invoke('send-sms', {
          body: { action: 'order_refunded', orderId: order.id },
        });
      } catch {}
      const updated = await api.fetchOrder(order.id);
      setOrder(updated);
      showAlert({ title: 'Test Refund Complete', message: 'Order marked as refunded. No money was moved.', variant: 'success' });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err?.message || 'Failed to process test refund.', variant: 'danger' });
    } finally {
      setRefunding(false);
    }
  };

  return (
    <PageShell title={`Order #${order.order_number}`} subtitle={formatDate(order.created_at)}>
      {isTestOrder && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.1))',
          border: '1px solid #f59e0b',
          color: '#d97706',
          padding: '0.375rem 0.75rem',
          borderRadius: 8,
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.03em',
          marginBottom: '0.75rem',
        }}>
          🧪 Test Order
        </div>
      )}
      <div className="order-top-actions">
        <Link to="/orders" className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back to Orders
        </Link>
        <button className="btn btn-ghost btn-sm" onClick={handlePrintPackingSlip}>
          <Printer size={16} /> Print Packing Slip
        </button>
      </div>

      <div className="order-detail-layout">
        {/* Left column */}
        <div className="order-detail-main">
          {/* Items */}
          <div className="order-section">
            <div className="order-section-header">
              <Package size={18} />
              <h3>Items</h3>
            </div>
            <div className="order-items-list">
              {items.map((item) => (
                <div className="order-item-row" key={item.id}>
                  {item.product_image_url ? (
                    <img src={item.product_image_url} alt={item.product_name} className="order-item-img" />
                  ) : (
                    <div className="order-item-img placeholder" />
                  )}
                  <div className="order-item-info">
                    <div className="order-item-name">
                      {item.product_name}
                      {item.pack_quantity && item.pack_quantity > 1 && (
                        <span className="order-item-pack-badge">Pack of {item.pack_quantity}</span>
                      )}
                    </div>
                    {item.variant_label && <div className="order-item-variant">Size: {item.variant_label}</div>}
                    {item.sku && <div className="order-item-sku">SKU: {item.sku}</div>}
                  </div>
                  <div className="order-item-qty">× {item.quantity}</div>
                  <div className="order-item-price">£{Number(item.total_price).toFixed(2)}</div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="order-totals">
              <div className="order-totals-row">
                <span>Subtotal</span>
                <span>£{Number(order.subtotal).toFixed(2)}</span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="order-totals-row discount">
                  <span>Discount ({order.discount_code})</span>
                  <span>−£{Number(order.discount_amount).toFixed(2)}</span>
                </div>
              )}
              {Number(order.gift_card_amount) > 0 && (
                <div className="order-totals-row discount">
                  <span>Gift Card ({order.gift_card_code})</span>
                  <span>−£{Number(order.gift_card_amount).toFixed(2)}</span>
                </div>
              )}
              {Number(order.tax_amount) > 0 && (
                <div className="order-totals-row">
                  <span>VAT</span>
                  <span>£{Number(order.tax_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="order-totals-row">
                <span>Shipping ({order.shipping_method || 'N/A'})</span>
                <span>£{Number(order.shipping_cost).toFixed(2)}</span>
              </div>
              <div className="order-totals-row total">
                <span>Total</span>
                <span>£{Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — status & info cards */}
        <div className="order-detail-sidebar">
          {/* Status management */}
          <div className="order-section">
            <div className="order-section-header">
              <Truck size={18} />
              <h3>Status</h3>
            </div>
            <div className="form-group">
              <label className="form-label">Order Status</label>
              <select
                className="form-input"
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value as Order['status'])}
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Status</label>
              <select
                className="form-input"
                value={order.payment_status}
                onChange={(e) => handlePaymentChange(e.target.value as Order['payment_status'])}
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="order-section">
            <div className="order-section-header">
              <Mail size={18} />
              <h3>Actions</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => handleSendEmail('send_order_confirmation', 'Order Confirmation')}
                disabled={sendingEmail === 'send_order_confirmation'}
              >
                {sendingEmail === 'send_order_confirmation' ? <Loader2 size={14} className="spin" /> : <Mail size={14} />}
                Send Confirmation
              </button>
              {isTestOrder && order.payment_status !== 'refunded' && (
                <button
                  className="btn btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', background: '#f59e0b', color: '#fff', border: 'none' }}
                  onClick={handleTestRefund}
                  disabled={refunding}
                >
                  {refunding ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />}
                  {refunding ? 'Processing…' : 'Test Refund'}
                </button>
              )}
              {!isTestOrder && order.payment_intent_id && order.payment_status === 'paid' && (
                <button
                  className="btn btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', background: '#ef4444', color: '#fff', border: 'none' }}
                  onClick={handleRefund}
                  disabled={refunding}
                >
                  {refunding ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />}
                  {refunding ? 'Processing Refund…' : 'Issue Refund'}
                </button>
              )}
              {order.payment_status === 'refunded' && (
                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 8, fontSize: '0.8125rem', color: '#dc2626', fontWeight: 600 }}>
                  ✓ This order has been refunded
                </div>
              )}
            </div>
          </div>

          {/* Tracking */}
          <div className="order-section">
            <div className="order-section-header">
              <Package size={18} />
              <h3>Shipping & Tracking</h3>
            </div>
            <div className="form-group">
              <label className="form-label">Carrier</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Royal Mail, DPD, Evri"
                value={shippingCarrier}
                onChange={(e) => setShippingCarrier(e.target.value)}
                list="carrier-suggestions"
              />
              <datalist id="carrier-suggestions">
                <option value="Royal Mail" />
                <option value="DPD" />
                <option value="Evri" />
                <option value="DHL" />
                <option value="UPS" />
                <option value="FedEx" />
                <option value="Parcelforce" />
                <option value="Yodel" />
                <option value="Amazon Logistics" />
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Tracking Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. RM123456789GB"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tracking URL</label>
              <div className="order-tracking-url-row">
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                />
                {order.tracking_url && (
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon-sm" title="Open tracking URL">
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>
            {hasTrackingChanges && (
              <button
                className="btn btn-primary btn-sm"
                style={{ width: '100%', marginTop: '0.25rem' }}
                onClick={handleSaveTracking}
                disabled={trackingSaving}
              >
                <Save size={14} /> {trackingSaving ? 'Saving…' : 'Save Tracking'}
              </button>
            )}
          </div>

          {/* Customer */}
          <div className="order-section">
            <div className="order-section-header">
              <User size={18} />
              <h3>Customer</h3>
            </div>
            <div className="order-info-block">
              <strong>{order.customer_name}</strong>
              <div>{order.customer_email}</div>
              {order.customer_phone && <div>{order.customer_phone}</div>}
              {order.contact_id && (
                <Link to={`/crm/${order.contact_id}`} className="btn btn-ghost btn-sm" style={{ marginTop: '0.5rem' }}>
                  View Contact →
                </Link>
              )}
              {order.company_id && (
                <Link to={`/companies/${order.company_id}`} className="btn btn-ghost btn-sm" style={{ marginTop: '0.25rem' }}>
                  <Building size={14} style={{ marginRight: '0.25rem' }} /> View Company →
                </Link>
              )}
            </div>
          </div>

          {/* Shipping address */}
          {shippingAddr && (
            <div className="order-section">
              <div className="order-section-header">
                <MapPin size={18} />
                <h3>Shipping Address</h3>
              </div>
              <div className="order-info-block">
                <div>{shippingAddr.line1}</div>
                {shippingAddr.line2 && <div>{shippingAddr.line2}</div>}
                <div>{shippingAddr.city}{shippingAddr.county ? `, ${shippingAddr.county}` : ''}</div>
                <div>{shippingAddr.postcode}</div>
                <div>{shippingAddr.country}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden packing slip ref for print */}
      <div ref={packingSlipRef} style={{ display: 'none' }} />
    </PageShell>
  );
}
