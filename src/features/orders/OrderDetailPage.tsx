import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { useAlert } from '@/components/ui/AlertDialog';
import * as api from '@/lib/api';
import type { Order, OrderItem } from '@/types/database';
import { ArrowLeft, Package, User, MapPin, Truck } from 'lucide-react';



const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;
const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded', 'failed'] as const;

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showAlert } = useAlert();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.fetchOrder(id),
      api.fetchOrderItems(id),
    ])
      .then(([o, i]) => { setOrder(o); setItems(i); })
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

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <PageShell title="Order"><div className="store-loading">Loading order...</div></PageShell>;
  if (!order) return <PageShell title="Order"><div className="store-loading">Order not found.</div></PageShell>;

  const shippingAddr = order.shipping_address as any;

  return (
    <PageShell title={`Order #${order.order_number}`} subtitle={formatDate(order.created_at)}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/orders" className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back to Orders
        </Link>
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
                    <div className="order-item-name">{item.product_name}</div>
                    {item.variant_label && <div className="order-item-variant">{item.variant_label}</div>}
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
    </PageShell>
  );
}
