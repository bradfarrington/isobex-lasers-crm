import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStoreConfig } from './useStoreConfig';
import * as api from '@/lib/api';
import type { PageBlock, Product, Collection } from '@/types/database';

interface Props {
  block: PageBlock;
}

export function BlockRenderer({ block }: Props) {
  const c = block.config;

  switch (block.type) {
    case 'hero':
      return (
        <div
          className="sf-block-hero"
          style={{
            backgroundImage: c.imageUrl ? `url(${c.imageUrl})` : undefined,
            backgroundColor: !c.imageUrl ? 'var(--sf-secondary)' : undefined,
          }}
        >
          <div className="sf-block-hero-overlay" style={{ opacity: c.overlayOpacity || 0.4 }} />
          <div className="sf-block-hero-content">
            <h1>{c.title}</h1>
            {c.subtitle && <p>{c.subtitle}</p>}
            {c.ctaText && <Link to={c.ctaLink || '/shop/products'} className="sf-hero-cta">{c.ctaText}</Link>}
          </div>
        </div>
      );

    case 'half_hero':
      return (
        <div className="sf-block-half-hero" style={{ height: c.height || '600px' }}>
          {c.imageUrl && <img src={c.imageUrl} alt={c.title || 'Hero'} className="sf-half-hero-img" style={{ objectPosition: c.objectPosition || 'center' }} />}
          {(c.title || c.ctaText) && (
            <div className="sf-half-hero-content">
              {c.title && <h2>{c.title}</h2>}
              {c.ctaText && <Link to={c.ctaLink || '#'} className="sf-btn sf-btn-primary">{c.ctaText}</Link>}
            </div>
          )}
        </div>
      );

    case 'heading': {
      const level = (c.level || 'h2') as 'h1' | 'h2' | 'h3' | 'h4';
      return (
        <div className="sf-block-heading" style={{ textAlign: c.align || 'center' }}>
          {React.createElement(level, null, c.text)}
        </div>
      );
    }

    case 'text':
      return (
        <div className="sf-block-text" style={{ textAlign: c.align || 'left' }}>
          <p>{c.text}</p>
        </div>
      );

    case 'image':
      return (
        <div className="sf-block-image" style={{ textAlign: c.align || 'center' }}>
          {c.url ? (
            <img src={c.url} alt={c.alt || ''} style={{ maxWidth: c.width || '100%' }} />
          ) : (
            <div className="sf-block-image-placeholder">No image set</div>
          )}
        </div>
      );

    case 'image_gallery':
      return (
        <div className="sf-block-gallery" style={{ gridTemplateColumns: `repeat(${c.columns || 3}, 1fr)`, gap: c.gap || 16 }}>
          {(c.images || []).map((url: string, i: number) => (
            <img key={i} src={url} alt={`Gallery image ${i + 1}`} className="sf-block-gallery-img" />
          ))}
        </div>
      );

    case 'button':
      return (
        <div className="sf-block-button" style={{ textAlign: c.align || 'center' }}>
          <Link
            to={c.link || '#'}
            className={`sf-btn sf-btn-${c.style || 'primary'} sf-btn-${c.size || 'md'}`}
          >
            {c.text || 'Button'}
          </Link>
        </div>
      );

    case 'product_grid':
      return <ProductGridBlock config={c} />;

    case 'collection_grid':
      return <CollectionGridBlock config={c} />;

    case 'collection_showcase':
      return <CollectionShowcaseBlock config={c} />;

    case 'category_links':
      return <CategoryLinksBlock config={c} />;

    case 'product_carousel':
      return <ProductCarouselBlock config={c} />;

    case 'featured_product':
      return <FeaturedProductBlock productId={c.productId} />;

    case 'spacer':
      return <div style={{ height: c.height || 40 }} />;

    case 'divider':
      return (
        <div className="sf-block-divider">
          <hr style={{ borderStyle: c.style || 'solid', borderColor: c.color || '#e5e7eb', borderWidth: `${c.thickness || 1}px 0 0 0` }} />
        </div>
      );

    case 'video':
      return <VideoBlock url={c.url} autoplay={c.autoplay} />;

    case 'testimonials':
      return (
        <div className="sf-block-testimonials">
          {(c.items || []).map((item: any, i: number) => (
            <div key={i} className="sf-testimonial-card">
              <div className="sf-testimonial-stars">{'★'.repeat(item.rating || 5)}</div>
              <p className="sf-testimonial-text">"{item.text}"</p>
              <p className="sf-testimonial-name">— {item.name}</p>
            </div>
          ))}
        </div>
      );

    case 'faq':
      return <FAQBlock items={c.items || []} />;

    case 'banner':
      return (
        <div
          className="sf-block-banner"
          style={{ backgroundColor: c.bgColor || '#1a1a2e', color: c.textColor || '#fff', textAlign: c.align || 'center' }}
        >
          {c.text}
        </div>
      );

    case 'custom_html':
      return <div className="sf-block-html" dangerouslySetInnerHTML={{ __html: c.html || '' }} />;

    default:
      return null;
  }
}

// ─── Sub-components ──────────────────────────────────────

function ProductGridBlock({ config }: { config: Record<string, any> }) {
  const { formatPrice } = useStoreConfig();
  const [products, setProducts] = useState<Product[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const prods = await api.fetchVisibleProducts();
        const limited = prods.slice(0, config.limit || 8);
        setProducts(limited);
        const thumbs = await api.fetchProductThumbnails(limited.map(p => p.id));
        setThumbnails(thumbs);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [config.limit]);

  return (
    <div className="sf-product-grid" style={{ gridTemplateColumns: `repeat(${config.columns || 4}, 1fr)` }}>
      {products.map(product => (
        <Link key={product.id} to={`/shop/products/${product.slug || product.id}`} className="sf-product-card">
          {thumbnails[product.id] ? (
            <img src={thumbnails[product.id]} alt={product.name} className="sf-product-card-image" />
          ) : (
            <div className="sf-product-card-placeholder">No Image</div>
          )}
          <div className="sf-product-card-info">
            <div className="sf-product-card-name">{product.name}</div>
            <div className="sf-product-card-price">{formatPrice(product.price)}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CollectionGridBlock({ config }: { config: Record<string, any> }) {
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    api.fetchCollections()
      .then(setCollections)
      .catch(console.error);
  }, []);

  return (
    <div className="sf-collection-grid" style={{ gridTemplateColumns: `repeat(${config.columns || 3}, 1fr)` }}>
      {collections.map(col => (
        <Link key={col.id} to={`/shop/collections/${col.slug || col.id}`} className="sf-collection-card">
          {col.cover_image_url && <img src={col.cover_image_url} alt={col.name} className="sf-collection-card-cover" />}
          <div className="sf-collection-card-overlay">
            <div>
              <div className="sf-collection-card-name">{col.name}</div>
              {col.product_count != null && <div className="sf-collection-card-count">{col.product_count} products</div>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function FeaturedProductBlock({ productId }: { productId: string }) {
  const { formatPrice } = useStoreConfig();
  const [product, setProduct] = useState<Product | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    api.fetchProductBySlug(productId).then(p => {
      setProduct(p);
      api.fetchProductThumbnails([p.id]).then(t => setThumbnail(t[p.id] || null));
    }).catch(console.error);
  }, [productId]);

  if (!product) return null;

  return (
    <div className="sf-block-featured-product">
      {thumbnail && <img src={thumbnail} alt={product.name} className="sf-block-featured-image" />}
      <div className="sf-block-featured-info">
        <h2>{product.name}</h2>
        <p className="sf-block-featured-price">{formatPrice(product.price)}</p>
        {product.description && <p>{product.description}</p>}
        <Link to={`/shop/products/${product.slug || product.id}`} className="sf-btn sf-btn-primary sf-btn-md">View Product</Link>
      </div>
    </div>
  );
}

function VideoBlock({ url, autoplay }: { url: string; autoplay: boolean }) {
  const getEmbedUrl = (input: string) => {
    const ytMatch = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}${autoplay ? '?autoplay=1&mute=1' : ''}`;
    const vimeoMatch = input.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}${autoplay ? '?autoplay=1&muted=1' : ''}`;
    return input;
  };

  if (!url) return <div className="sf-block-image-placeholder">No video URL set</div>;

  return (
    <div className="sf-block-video">
      <iframe src={getEmbedUrl(url)} allowFullScreen allow="autoplay" title="Video" />
    </div>
  );
}

function FAQBlock({ items }: { items: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="sf-block-faq">
      {items.map((item, i) => (
        <div key={i} className={`sf-faq-item ${openIndex === i ? 'open' : ''}`}>
          <button className="sf-faq-question" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
            <span>{item.question}</span>
            <span className="sf-faq-arrow">{openIndex === i ? '−' : '+'}</span>
          </button>
          {openIndex === i && <div className="sf-faq-answer">{item.answer}</div>}
        </div>
      ))}
    </div>
  );
}

function CollectionShowcaseBlock({ config }: { config: Record<string, any> }) {
  const { formatPrice } = useStoreConfig();
  const [products, setProducts] = useState<Product[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        let prods: Product[] = [];
        if (config.collectionId) {
          prods = await api.fetchCollectionProductsBySlugOrId(config.collectionId);
        } else {
          prods = await api.fetchVisibleProducts(); // Fallback to all if no collection specified
        }
        const limited = prods.slice(0, config.limit || 5);
        setProducts(limited);
        const thumbs = await api.fetchProductThumbnails(limited.map(p => p.id));
        setThumbnails(thumbs);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [config.collectionId, config.limit]);

  return (
    <div className="sf-showcase-block">
      <div className="sf-showcase-header">
        <div className="sf-showcase-text">
          {config.title && <h2 className="sf-showcase-title">{config.title}</h2>}
          {config.subtitle && <p className="sf-showcase-subtitle">{config.subtitle}</p>}
        </div>
        {config.ctaText && (
          <Link to={config.ctaLink || '#'} className="sf-showcase-cta">
            {config.ctaText}
          </Link>
        )}
      </div>
      <div className="sf-showcase-grid" style={{ gridTemplateColumns: `repeat(${config.limit || 5}, 1fr)` }}>
        {products.map(product => (
          <Link key={product.id} to={`/shop/products/${product.slug || product.id}`} className="sf-showcase-card">
            <div className="sf-showcase-img-wrap">
              {thumbnails[product.id] ? (
                <img src={thumbnails[product.id]} alt={product.name} className="sf-showcase-img" />
              ) : (
                <div className="sf-showcase-img-placeholder" />
              )}
            </div>
            <div className="sf-showcase-info">
              <div className="sf-showcase-name">{product.name}</div>
              <div className="sf-showcase-price">{formatPrice(product.price)}</div>
            </div>
            {config.showSwatches && (
              <div className="sf-showcase-swatches">
                <div className="sf-swatch sf-swatch-1"></div>
                <div className="sf-swatch sf-swatch-2"></div>
                <div className="sf-swatch sf-swatch-3"></div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

function CategoryLinksBlock({ config }: { config: Record<string, any> }) {
  const items = config.items || [];
  return (
    <div className="sf-category-links" style={{ gridTemplateColumns: `repeat(${items.length || 3}, 1fr)` }}>
      {items.map((item: any, i: number) => (
        <Link key={i} to={item.link || '#'} className="sf-catlink-card">
          {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="sf-catlink-img" />}
          <div className="sf-catlink-overlay">
            <h3 className="sf-catlink-title">{item.title}</h3>
            <span className="sf-catlink-cta">SHOP NOW</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ProductCarouselBlock({ config }: { config: Record<string, any> }) {
  const { formatPrice } = useStoreConfig();
  const [products, setProducts] = useState<Product[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        let prods: Product[] = [];
        if (config.collectionId) {
          prods = await api.fetchCollectionProductsBySlugOrId(config.collectionId);
        } else {
          prods = await api.fetchVisibleProducts();
        }
        const limited = prods.slice(0, config.limit || 10);
        setProducts(limited);
        const thumbs = await api.fetchProductThumbnails(limited.map(p => p.id));
        setThumbnails(thumbs);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [config.collectionId, config.limit]);

  return (
    <div className="sf-carousel-block">
      <div className="sf-carousel-sidebar">
        {config.title && <h2 className="sf-carousel-title">{config.title}</h2>}
        {config.ctaText && (
          <Link to={config.ctaLink || '#'} className="sf-carousel-cta">
            {config.ctaText}
          </Link>
        )}
      </div>
      <div className="sf-carousel-track">
        {products.map(product => (
          <Link key={product.id} to={`/shop/products/${product.slug || product.id}`} className="sf-carousel-card">
            <div className="sf-carousel-img-wrap">
              {thumbnails[product.id] ? (
                <img src={thumbnails[product.id]} alt={product.name} className="sf-carousel-img" />
              ) : (
                <div className="sf-carousel-img-placeholder" />
              )}
            </div>
            <div className="sf-carousel-info">
              <div className="sf-carousel-name">{product.name}</div>
              <div className="sf-carousel-price">{formatPrice(product.price)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
