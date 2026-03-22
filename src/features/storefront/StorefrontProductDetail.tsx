import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStoreConfig } from './useStoreConfig';
import { useCart } from './useCart';
import * as api from '@/lib/api';
import type { Product, ProductMedia, ProductOptionGroup, ProductVariant, LookupItem } from '@/types/database';

export function StorefrontProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { formatPrice } = useStoreConfig();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductMedia[]>([]);
  const [options, setOptions] = useState<ProductOptionGroup[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [compatibilities, setCompatibilities] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [addedMsg, setAddedMsg] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      try {
        const p = await api.fetchProductBySlug(slug);
        setProduct(p);

        const [imgs, opts, vars, compat] = await Promise.all([
          api.fetchProductImages(p.id),
          api.fetchProductOptions(p.id),
          api.fetchProductVariants(p.id),
          api.fetchProductCompatibilities(p.id),
        ]);
        setImages(imgs);
        setOptions(opts);
        setVariants(vars);
        setCompatibilities(compat);

        // Pre-select first option value
        const defaults: Record<string, string> = {};
        opts.forEach((group) => {
          if (group.values && group.values.length > 0) {
            defaults[group.id] = group.values[0].id;
          }
        });
        setSelectedOptions(defaults);
      } catch (err) {
        console.error('Failed to load product:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  // Find matching variant based on selected options
  const matchingVariant = variants.find((v) => {
    return v.option_values.every(
      (ov) => selectedOptions[ov.group_id] === ov.value_id
    );
  });

  const effectivePrice = matchingVariant?.price_override ?? product?.price ?? 0;
  const effectiveCompare = matchingVariant?.compare_at_price ?? product?.compare_at_price ?? null;

  const handleAddToCart = () => {
    if (!product) return;

    const variantLabel = matchingVariant
      ? matchingVariant.option_values.map((ov) => ov.value).join(' / ')
      : null;

    addItem({
      productId: product.id,
      variantId: matchingVariant?.id || null,
      name: product.name,
      variantLabel,
      price: effectivePrice,
      compareAtPrice: effectiveCompare,
      quantity,
      imageUrl: images[0]?.media_url || null,
      weightKg: product.weight_kg || 0,
      sku: matchingVariant?.sku || product.sku || null,
      slug: product.slug || product.id,
    });

    setAddedMsg(true);
    setTimeout(() => setAddedMsg(false), 2000);
  };

  if (loading) return <div className="sf-loading">Loading product...</div>;
  if (!product) return <div className="sf-loading">Product not found.</div>;

  return (
    <div className="sf-product-detail">
      {/* Gallery */}
      <div className="sf-gallery">
        {images.length > 0 ? (
          <>
            <img
              src={images[selectedImage]?.media_url}
              alt={product.name}
              className="sf-gallery-main"
            />
            {images.length > 1 && (
              <div className="sf-gallery-thumbs">
                {images.map((img, i) => (
                  <img
                    key={img.id}
                    src={img.media_url}
                    alt={`${product.name} ${i + 1}`}
                    className={`sf-gallery-thumb ${i === selectedImage ? 'active' : ''}`}
                    onClick={() => setSelectedImage(i)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="sf-gallery-main-placeholder">No images uploaded</div>
        )}
      </div>

      {/* Product Info */}
      <div className="sf-product-info">
        <h1>{product.name}</h1>

        <div className="sf-product-price">
          {formatPrice(effectivePrice)}
          {effectiveCompare && effectiveCompare > effectivePrice && (
            <span className="compare">{formatPrice(effectiveCompare)}</span>
          )}
        </div>

        {product.description && (
          <div className="sf-product-description">{product.description}</div>
        )}

        {compatibilities.length > 0 && (
          <div className="sf-compat-tags">
            <span className="sf-compat-label">Compatible with:</span>
            {compatibilities.map((c) => (
              <span key={c.id} className="sf-compat-badge">{c.name}</span>
            ))}
          </div>
        )}

        {/* Variant selectors */}
        {options.length > 0 && (
          <div className="sf-variant-selector">
            {options.map((group) => (
              <div className="sf-variant-group" key={group.id}>
                <label>{group.name}</label>
                <select
                  value={selectedOptions[group.id] || ''}
                  onChange={(e) =>
                    setSelectedOptions((prev) => ({ ...prev, [group.id]: e.target.value }))
                  }
                >
                  {(group.values || []).map((val) => (
                    <option key={val.id} value={val.id}>{val.value}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Quantity */}
        <div className="sf-qty-row">
          <label>Quantity</label>
          <input
            type="number"
            className="sf-qty-input"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            min="1"
          />
        </div>

        {/* Add to cart */}
        <button className="sf-add-to-cart-btn" onClick={handleAddToCart}>
          {addedMsg ? '✓ Added to Cart!' : 'Add to Cart'}
        </button>

        {/* SKU */}
        {(matchingVariant?.sku || product.sku) && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--sf-text-secondary)' }}>
            SKU: {matchingVariant?.sku || product.sku}
          </p>
        )}
      </div>
    </div>
  );
}
