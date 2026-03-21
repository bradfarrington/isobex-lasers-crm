import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStoreConfig } from './useStoreConfig';
import * as api from '@/lib/api';
import type { Product, Collection } from '@/types/database';

export function StorefrontCollectionDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { formatPrice } = useStoreConfig();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      try {
        const col = await api.fetchCollectionBySlug(slug);
        setCollection(col);
        const prods = await api.fetchProductsByCollectionId(col.id);
        setProducts(prods);
        const thumbs = await api.fetchProductThumbnails(prods.map((p) => p.id));
        setThumbnails(thumbs);
      } catch (err) {
        console.error('Failed to load collection:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const getProductPrice = (product: Product) => {
    if (product.variant_price_min != null && product.variant_price_min > 0) {
      if (product.variant_price_max != null && product.variant_price_max !== product.variant_price_min) {
        return `${formatPrice(product.variant_price_min)} – ${formatPrice(product.variant_price_max)}`;
      }
      return formatPrice(product.variant_price_min);
    }
    return formatPrice(product.price);
  };

  if (loading) return <div className="sf-loading">Loading...</div>;
  if (!collection) return <div className="sf-loading">Collection not found.</div>;

  return (
    <div>
      <div className="sf-page-header">
        <h1>{collection.name}</h1>
        {collection.description && <p>{collection.description}</p>}
      </div>

      <div className="sf-toolbar">
        <span className="sf-result-count">{products.length} products</span>
      </div>

      <div className="sf-product-grid">
        {products.map((product) => (
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
              <div className="sf-product-card-price">{getProductPrice(product)}</div>
            </div>
          </Link>
        ))}
      </div>

      {products.length === 0 && (
        <div className="sf-loading">No products in this collection yet.</div>
      )}
    </div>
  );
}
