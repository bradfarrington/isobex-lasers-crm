import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '@/lib/api';
import type { Order } from '@/types/database';
import { ShoppingCart } from 'lucide-react';
import './ContactOrdersTab.css';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  paid: '#22c55e',
  processing: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
  refunded: '#6b7280',
  partially_refunded: '#f97316',
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: '#f59e0b',
  paid: '#22c55e',
  refunded: '#6b7280',
  partially_refunded: '#f97316',
  failed: '#ef4444',
};

interface Props {
  contactId: string;
}

export function ContactOrdersTab({ contactId }: Props) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .fetchOrdersByContact(contactId)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [contactId]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const totalSpend = useMemo(
    () => orders.reduce((sum, o) => sum + Number(o.total), 0),
    [orders]
  );

  const lastOrder = useMemo(
    () => (orders.length > 0 ? formatDate(orders[0].created_at) : '—'),
    [orders]
  );

  if (loading) {
    return <div className="contact-orders-loading">Loading orders…</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="contact-detail-grid">
        <div className="contact-detail-card">
          <div className="contact-detail-card-header">
            <div className="contact-detail-card-title">
              <ShoppingCart size={14} />
              Orders
            </div>
          </div>
          <div className="tab-placeholder">
            <ShoppingCart size={32} />
            <h4>No orders yet</h4>
            <p>Orders linked to this contact will appear here.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-detail-grid single-column">
      {/* Summary cards */}
      <div className="contact-orders-summary">
        <div className="contact-orders-summary-card">
          <div className="contact-orders-summary-value">{orders.length}</div>
          <div className="contact-orders-summary-label">Total Orders</div>
        </div>
        <div className="contact-orders-summary-card">
          <div className="contact-orders-summary-value">£{totalSpend.toFixed(2)}</div>
          <div className="contact-orders-summary-label">Total Spend</div>
        </div>
        <div className="contact-orders-summary-card">
          <div className="contact-orders-summary-value">{lastOrder}</div>
          <div className="contact-orders-summary-label">Last Order</div>
        </div>
      </div>

      {/* Orders table */}
      <div className="contact-detail-card full-width">
        <div className="contact-detail-card-header">
          <div className="contact-detail-card-title">
            <ShoppingCart size={14} />
            Orders
          </div>
        </div>
        <div className="contact-orders-table-wrap">
          <table className="contact-orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Status</th>
                <th>Payment</th>
                <th className="contact-orders-col-total-header">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} onClick={() => navigate(`/orders/${order.id}`)}>
                  <td className="contact-orders-col-number">#{order.order_number}</td>
                  <td>{formatDate(order.created_at)}</td>
                  <td>
                    <span
                      className="contact-orders-status-badge"
                      style={{
                        backgroundColor: (STATUS_COLORS[order.status] || '#6b7280') + '18',
                        color: STATUS_COLORS[order.status] || '#6b7280',
                      }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <span
                      className="contact-orders-status-badge"
                      style={{
                        backgroundColor: (PAYMENT_COLORS[order.payment_status] || '#6b7280') + '18',
                        color: PAYMENT_COLORS[order.payment_status] || '#6b7280',
                      }}
                    >
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="contact-orders-col-total">£{Number(order.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
