import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { StoreTabBar } from './StoreTabBar';
import { useData } from '@/context/DataContext';
import * as api from '@/lib/api';
import type { Product } from '@/types/database';
import { Plus, Search, Eye, EyeOff, Package } from 'lucide-react';
import './StorePage.css';

export function StorePage() {
  const navigate = useNavigate();
  const { state } = useData();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [labelAssignments, setLabelAssignments] = useState<Record<string, string[]>>({});
  const [tooltipProduct, setTooltipProduct] = useState<Product | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.fetchProducts();
      setProducts(data);

      // Fetch label assignments for all products
      const assignments: Record<string, string[]> = {};
      await Promise.all(
        data.map(async (p) => {
          assignments[p.id] = await api.fetchProductLabelIds(p.id);
        })
      );
      setLabelAssignments(assignments);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (product: Product) => {
    try {
      const updated = await api.updateProduct(product.id, {
        is_visible: !product.is_visible,
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const getLabelsForProduct = (productId: string) => {
    const ids = labelAssignments[productId] || [];
    return state.productLabels.filter((l) => ids.includes(l.id));
  };

  const formatPrice = (price: number) =>
    `£${Number(price).toFixed(2)}`;

  const showTooltip = (e: React.MouseEvent, product: Product) => {
    // Immediately cancel any pending hide so we never flash null between rows
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
      tooltipTimeout.current = undefined;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    // Update position first, then product, to avoid showing the old tooltip at the new position
    setTooltipPos({ top: rect.top, left: rect.left });
    setTooltipProduct(product);
  };

  const hideTooltip = () => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    tooltipTimeout.current = setTimeout(() => setTooltipProduct(null), 100);
  };

  const effectiveStockFor = (product: Product) => {
    const hasVariants = product.variant_count && product.variant_count > 0;
    return hasVariants ? (product.total_variant_stock ?? 0) : product.stock_quantity;
  };

  return (
    <PageShell
      title="Online Store"
      subtitle="Manage your ecommerce products, categories, and storefront."
    >
      <StoreTabBar />

      <div className="store-toolbar">
        <div className="store-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/store/new')}>
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {loading ? (
        <div className="store-loading">Loading products...</div>
      ) : filtered.length === 0 ? (
        <div className="store-empty">
          <Package size={48} />
          <h3>{search ? 'No products match your search' : 'No products yet'}</h3>
          <p>
            {search
              ? 'Try a different search term.'
              : 'Click "Add Product" to create your first product.'}
          </p>
        </div>
      ) : (
        <div className="products-table-wrap">
          <table className="products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Labels</th>
                <th>Visible</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const labels = getLabelsForProduct(product.id);
                const hasVariants = product.variant_count && product.variant_count > 0;
                const effectiveStock = effectiveStockFor(product);
                const status =
                  effectiveStock <= 0
                    ? 'out'
                    : product.min_stock_threshold > 0 && effectiveStock <= product.min_stock_threshold
                    ? 'low'
                    : 'good';
                return (
                  <tr
                    key={product.id}
                    className="products-table-row"
                    onClick={() => navigate(`/store/${product.id}`)}
                  >
                    <td className="product-name-cell">
                      <span className="product-name">{product.name}</span>
                      {product.sku && (
                        <span className="product-sku">SKU: {product.sku}</span>
                      )}
                    </td>
                    <td>
                      <span className={`product-type-badge ${product.product_type}`}>
                        {product.product_type === 'physical' ? 'Physical' : 'Digital'}
                      </span>
                    </td>
                    <td className="product-price-cell">
                      <span className="product-price">{formatPrice(product.price)}</span>
                      {product.compare_at_price && product.compare_at_price > product.price && (
                        <span className="product-compare-price">
                          {formatPrice(product.compare_at_price)}
                        </span>
                      )}
                    </td>
                    <td>
                      <div
                        className="stock-cell-wrap"
                        onMouseEnter={(e) => hasVariants && showTooltip(e, product)}
                        onMouseLeave={hideTooltip}
                      >
                        <span className={`stock-badge ${status}`}>
                          {effectiveStock}
                        </span>
                        {hasVariants && (
                          <span className="variant-stock-hint">
                            ({product.variant_count} variants)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="product-labels-cell">
                      {labels.map((l) => (
                        <span
                          key={l.id}
                          className="product-label-badge"
                          style={{ backgroundColor: l.color || '#6b7280' }}
                        >
                          {l.name}
                        </span>
                      ))}
                    </td>
                    <td>
                      <button
                        className={`visibility-btn ${product.is_visible ? 'visible' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(product);
                        }}
                        title={product.is_visible ? 'Visible on store' : 'Hidden from store'}
                      >
                        {product.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Portal tooltip — renders outside table to avoid overflow clipping */}
      {tooltipProduct && tooltipProduct.variant_stock_details && createPortal(
        <div
          className="variant-stock-tooltip"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
          onMouseEnter={() => clearTimeout(tooltipTimeout.current)}
          onMouseLeave={hideTooltip}
        >
          <div className="variant-stock-tooltip-title">Stock by Variant</div>
          {tooltipProduct.variant_stock_details.map((d, i) => (
            <div key={i} className="variant-stock-row">
              <span className="variant-stock-label">{d.label}</span>
              <span className={`variant-stock-qty ${d.stock <= 0 ? 'out' : ''}`}>
                {d.stock}
              </span>
            </div>
          ))}
          <div className="variant-stock-total">
            <span>Total</span>
            <span>{effectiveStockFor(tooltipProduct)}</span>
          </div>
        </div>,
        document.body
      )}
    </PageShell>
  );
}
