import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { useAlert } from '@/components/ui/AlertDialog';
import * as api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/types/database';
import './Orders.css';
import { PackageCheck, Search, Trash2, Eye } from 'lucide-react';

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

export function OrdersPage() {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useAlert();
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

  const handleDelete = async (e: React.MouseEvent, id: string, orderNumber: number) => {
    e.stopPropagation();
    
    const ok = await showConfirm({
      title: 'Delete Order',
      message: `Are you sure you want to delete Order #${orderNumber}? This action permanently removes it from the database and your analytics.`,
      confirmLabel: 'Delete',
    });
    
    if (!ok) return;
    
    // Optimistic UI Removal
    setOrders(prev => prev.filter(o => o.id !== id));
    
    // Server Execution
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
       console.error("Deletion failed:", error);
       showAlert({ title: 'Error', message: 'Failed to delete the order from the server.', variant: 'danger' });
    } else {
       showAlert({ title: 'Deleted', message: `Order #${orderNumber} was deleted.`, variant: 'success' });
    }
  };

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
            <option value="partially_refunded">Partially Refunded</option>
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
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="orders-table-row group" onClick={() => navigate(`/orders/${order.id}`)}>
                  <td className="orders-col-number">
                    <strong>#{order.order_number}</strong>
                    {order.notes?.includes('[TEST ORDER]') && (
                      <span style={{
                        display: 'inline-block',
                        marginLeft: 6,
                        padding: '1px 6px',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        background: 'rgba(245,158,11,0.12)',
                        color: '#d97706',
                        borderRadius: 4,
                        verticalAlign: 'middle',
                        letterSpacing: '0.04em',
                      }}>TEST</span>
                    )}
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
                  <td className="orders-col-actions">
                    <button 
                       className="orders-view-btn"
                       onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}
                       title="View Order"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                       className="orders-delete-btn"
                       onClick={(e) => handleDelete(e, order.id, order.order_number)}
                       title="Delete Order"
                    >
                      <Trash2 size={16} />
                    </button>
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
