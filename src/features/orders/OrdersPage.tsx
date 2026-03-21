import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import * as api from '@/lib/api';
import type { Order } from '@/types/database';
import './Orders.css';
import { PackageCheck, Eye, Search } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  paid: '#22c55e',
  processing: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
  refunded: '#6b7280',
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: '#f59e0b',
  paid: '#22c55e',
  refunded: '#6b7280',
  failed: '#ef4444',
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    api.fetchOrders()
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !search ||
      order.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(search.toLowerCase()) ||
      String(order.order_number).includes(search);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <PageShell
      title="Orders"
      subtitle="Track orders, fulfilment status, and shipping."
    >
      <div className="orders-toolbar">
        <div className="orders-search-wrap">
          <Search size={16} className="orders-search-icon" />
          <input
            type="text"
            className="form-input orders-search"
            placeholder="Search by name, email, or order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="orders-filter-wrap">
          <select
            className="form-input orders-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="store-loading">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="module-placeholder">
          <div className="module-placeholder-icon">
            <PackageCheck size={48} />
          </div>
          <h3>No Orders Found</h3>
          <p>{orders.length === 0 ? 'Orders will appear here once customers start purchasing from your store.' : 'No orders match your current filters.'}</p>
        </div>
      ) : (
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="orders-col-number">
                    <strong>#{order.order_number}</strong>
                  </td>
                  <td className="orders-col-date">{formatDate(order.created_at)}</td>
                  <td className="orders-col-customer">
                    <div className="orders-customer-name">{order.customer_name}</div>
                    <div className="orders-customer-email">{order.customer_email}</div>
                  </td>
                  <td>
                    <span
                      className="orders-status-badge"
                      style={{ backgroundColor: STATUS_COLORS[order.status] + '18', color: STATUS_COLORS[order.status] }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <span
                      className="orders-status-badge"
                      style={{ backgroundColor: PAYMENT_COLORS[order.payment_status] + '18', color: PAYMENT_COLORS[order.payment_status] }}
                    >
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="orders-col-total">
                    <strong>£{Number(order.total).toFixed(2)}</strong>
                  </td>
                  <td>
                    <Link to={`/orders/${order.id}`} className="btn btn-ghost btn-icon-sm" title="View order">
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
