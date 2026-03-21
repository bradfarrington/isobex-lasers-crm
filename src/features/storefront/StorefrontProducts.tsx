import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStoreConfig } from './useStoreConfig';
import * as api from '@/lib/api';
import type { Product } from '@/types/database';

export function StorefrontProducts() {
  const { formatPrice } = useStoreConfig();
  const [products, setProducts] = useState<Product[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    const load = async () => {
      try {
        const prods = await api.fetchVisibleProducts();
        setProducts(prods);
        const thumbs = await api.fetchProductThumbnails(prods.map((p) => p.id));
        setThumbnails(thumbs);
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return (a.price || 0) - (b.price || 0);
      case 'price-high':
        return (b.price || 0) - (a.price || 0);
      case 'name-az':
        return a.name.localeCompare(b.name);
      case 'name-za':
        return b.name.localeCompare(a.name);
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const getProductPrice = (product: Product) => {
    if (product.variant_price_min != null && product.variant_price_min > 0) {
      if (product.variant_price_max != null && product.variant_price_max !== product.variant_price_min) {
        return `${formatPrice(product.variant_price_min)} – ${formatPrice(product.variant_price_max)}`;
      }
      return formatPrice(product.variant_price_min);
    }
    return formatPrice(product.price);
  };

  if (loading) {
    return <div className="sf-loading">Loading products...</div>;
  }

  return (
    <div>
      <div className="sf-page-header">
        <h1>All Products</h1>
        <p>Browse our complete range of products</p>
      </div>

      <div className="sf-toolbar">
        <span className="sf-result-count">{products.length} products</span>
        <select
          className="sf-sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="name-az">Name: A–Z</option>
          <option value="name-za">Name: Z–A</option>
        </select>
      </div>

      <div className="sf-product-grid">
        {sortedProducts.map((product) => (
          <Link
            key={product.id}
            to={`/shop/products/${product.slug || product.id}`}
            className="sf-product-card"
          >
            {thumbnails[product.id] ? (
              <img src={thumbnails[product.id]} alt={product.name} className="sf-product-card-image" />
            ) : (
              <div className="sf-product-card-placeholder">No Image</div>
            )}
            <div className="sf-product-card-info">
              <div className="sf-product-card-name">{product.name}</div>
              <div className="sf-product-card-price">
                {getProductPrice(product)}
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="sf-product-card-compare">
                    {formatPrice(product.compare_at_price)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {products.length === 0 && (
        <div className="sf-loading">No products available yet.</div>
      )}
    </div>
  );
}
