import { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { StoreTabBar } from './StoreTabBar';
import * as api from '@/lib/api';
import type { InventoryItem } from '@/types/database';
import { Search, Download, BarChart3, AlertTriangle, XCircle, Package } from 'lucide-react';
import './StorePage.css';

type FilterTab = 'all' | 'low' | 'out';

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await api.fetchInventorySummary();
      setItems(data);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (item: InventoryItem): 'good' | 'low' | 'out' => {
    if (item.stock_quantity <= 0) return 'out';
    if (item.min_stock_threshold > 0 && item.stock_quantity <= item.min_stock_threshold) return 'low';
    return 'good';
  };

  const filtered = items
    .filter((item) => {
      if (filter === 'low') return getStatus(item) === 'low';
      if (filter === 'out') return getStatus(item) === 'out';
      return true;
    })
    .filter((item) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        item.product_name.toLowerCase().includes(q) ||
        (item.product_sku && item.product_sku.toLowerCase().includes(q)) ||
        (item.variant_sku && item.variant_sku.toLowerCase().includes(q)) ||
        (item.variant_label && item.variant_label.toLowerCase().includes(q))
      );
    });

  const lowCount = items.filter((i) => getStatus(i) === 'low').length;
  const outCount = items.filter((i) => getStatus(i) === 'out').length;

  const formatPrice = (price: number) => `£${Number(price).toFixed(2)}`;

  const handleExportPDF = () => {
    // Build a simple printable HTML table and trigger print dialog
    const now = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const rows = filtered
      .map(
        (item) => `
        <tr>
          <td>${item.product_name}</td>
          <td>${item.variant_label || '—'}</td>
          <td>${item.variant_sku || item.product_sku || '—'}</td>
          <td style="text-align:right">${item.stock_quantity}</td>
          <td style="text-align:right">${item.min_stock_threshold}</td>
          <td style="text-align:right">${formatPrice(item.price)}</td>
          <td>${item.continue_selling_when_out_of_stock ? 'Yes' : 'No'}</td>
          <td>${getStatus(item) === 'out' ? 'OUT OF STOCK' : getStatus(item) === 'low' ? 'LOW STOCK' : 'In Stock'}</td>
        </tr>`
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .date { color: #666; margin-bottom: 20px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #333; font-weight: 600; }
          td { padding: 6px 12px; border-bottom: 1px solid #e5e5e5; }
          tr:nth-child(even) td { background: #f9f9f9; }
          .footer { margin-top: 24px; font-size: 11px; color: #999; }
        </style>
      </head>
      <body>
        <h1>Inventory Report — Isobex Industrial Lasers</h1>
        <div class="date">Generated: ${now}</div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Variant</th>
              <th>SKU</th>
              <th style="text-align:right">Stock</th>
              <th style="text-align:right">Min. Threshold</th>
              <th style="text-align:right">Price</th>
              <th>Continue Selling</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">Total items: ${filtered.length}</div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  return (
    <PageShell
      title="Online Store"
      subtitle="Manage your ecommerce products, categories, and storefront."
    >
      <StoreTabBar />

      {/* Summary stats */}
      {!loading && items.length > 0 && (
        <div className="inventory-summary-bar">
          <div className="inventory-stat">
            <Package size={16} />
            <span><strong>{items.length}</strong> total items</span>
          </div>
          {lowCount > 0 && (
            <div className="inventory-stat warning">
              <AlertTriangle size={16} />
              <span><strong>{lowCount}</strong> low stock</span>
            </div>
          )}
          {outCount > 0 && (
            <div className="inventory-stat danger">
              <XCircle size={16} />
              <span><strong>{outCount}</strong> out of stock</span>
            </div>
          )}
        </div>
      )}

      <div className="store-toolbar">
        <div className="store-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by product, SKU, or variant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="inventory-filters">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-tab ${filter === 'low' ? 'active' : ''}`}
            onClick={() => setFilter('low')}
          >
            <AlertTriangle size={14} />
            Low Stock
          </button>
          <button
            className={`filter-tab ${filter === 'out' ? 'active' : ''}`}
            onClick={() => setFilter('out')}
          >
            <XCircle size={14} />
            Out of Stock
          </button>
        </div>
        <button className="btn btn-secondary" onClick={handleExportPDF}>
          <Download size={16} />
          Export PDF
        </button>
      </div>

      {loading ? (
        <div className="store-loading">Loading inventory...</div>
      ) : filtered.length === 0 ? (
        <div className="store-empty">
          <BarChart3 size={48} />
          <h3>No inventory items found</h3>
          <p>{search ? 'Try a different search term.' : 'Add products to see inventory here.'}</p>
        </div>
      ) : (
        <div className="products-table-wrap">
          <table className="products-table inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Min. Threshold</th>
                <th>Price</th>
                <th>Continue Selling</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const status = getStatus(item);
                return (
                  <tr key={`${item.product_id}-${item.variant_id || idx}`} className={`inventory-row ${status}`}>
                    <td className="product-name-cell">
                      <span className="product-name">{item.product_name}</span>
                    </td>
                    <td>{item.variant_label || '—'}</td>
                    <td className="product-sku">{item.variant_sku || item.product_sku || '—'}</td>
                    <td>
                      <span className={`stock-badge ${status}`}>
                        {item.stock_quantity}
                      </span>
                    </td>
                    <td>{item.min_stock_threshold}</td>
                    <td>{formatPrice(item.price)}</td>
                    <td>
                      <span className={`continue-selling-badge ${item.continue_selling_when_out_of_stock ? 'on' : 'off'}`}>
                        {item.continue_selling_when_out_of_stock ? 'On' : 'Off'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-indicator ${status}`}>
                        {status === 'out' && <><XCircle size={14} /> Out of Stock</>}
                        {status === 'low' && <><AlertTriangle size={14} /> Low Stock</>}
                        {status === 'good' && 'In Stock'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
