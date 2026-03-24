import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStoreConfig } from './useStoreConfig';
import * as api from '@/lib/api';
import * as Icons from 'lucide-react';
import type { PageBlock, Product, Collection } from '@/types/database';

interface Props {
  block: PageBlock;
}

export function BlockRenderer({ block }: Props) {
  const isPreview = typeof window !== 'undefined' && window.location.search.includes('preview=true');
  const content = <BlockContent block={block} />;

  if (isPreview) {
    return (
      <div 
        className="sf-preview-block-wrapper" 
        data-block-id={block.id}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          window.parent.postMessage({ type: 'BLOCK_CLICKED', blockId: block.id }, '*');
        }}
        title={`Click to edit ${block.type} block`}
      >
        {content}
      </div>
    );
  }

  return content;
}

export function BlockContent({ block }: Props) {
  const c = block.config;

  switch (block.type) {
    case 'container':
      return (
        <div style={{
          backgroundColor: c.bgColor || 'transparent',
          padding: c.padding || '40px 20px',
          display: 'flex',
          justifyContent: 'center',
          marginTop: c.marginTop || undefined,
          marginBottom: c.marginBottom || undefined,
          borderWidth: c.borderWidth ? `${c.borderWidth}px` : undefined,
          borderStyle: c.borderWidth ? (c.borderStyle || 'solid') : undefined,
          borderColor: c.borderWidth ? (c.borderColor || '#e5e7eb') : undefined,
          borderRadius: c.borderRadius ? `${c.borderRadius}px` : undefined,
          boxShadow: c.shadow ? (c.shadowValue || '0 4px 24px rgba(0,0,0,0.08)') : undefined,
          overflow: c.overflow || undefined,
        }}>
          <div style={{ maxWidth: c.maxWidth || '1200px', width: '100%', display: 'flex', flexDirection: 'column', gap: c.gap ? `${c.gap}px` : undefined }}>
            {(c.blocks || []).map((childBlock: PageBlock) => (
              <BlockRenderer key={childBlock.id} block={childBlock} />
            ))}
          </div>
        </div>
      );

    case 'columns':
      const cols = c.columns || [[], []];
      return (
        <div className={`sf-block-columns ${c.stackOnMobile ? 'stack-mobile' : ''}`} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`, gap: `${c.gap || 16}px`, width: '100%' }}>
          {cols.map((col: any, idx: number) => {
            // Backward compat: old format is plain array, new format is { blocks, bgColor, ... }
            const colBlocks: PageBlock[] = Array.isArray(col) ? col : (col.blocks || []);
            const colStyle: React.CSSProperties = Array.isArray(col) ? {} : {
              backgroundColor: col.bgColor || undefined,
              borderWidth: col.borderWidth ? `${col.borderWidth}px` : undefined,
              borderStyle: col.borderWidth ? 'solid' : undefined,
              borderColor: col.borderColor || undefined,
              borderRadius: col.borderRadius ? `${col.borderRadius}px` : undefined,
              padding: col.padding || undefined,
            };
            return (
              <div key={idx} className="sf-column" style={colStyle}>
                {colBlocks.map((childBlock: PageBlock) => (
                  <BlockRenderer key={childBlock.id} block={childBlock} />
                ))}
              </div>
            );
          })}
        </div>
      );

    case 'hero': {
      const bgMode = c.bgMode || 'image';
      const hasImage = bgMode === 'image' && c.imageUrl;
      const heroStyle: React.CSSProperties = {
        backgroundImage: hasImage ? `url(${c.imageUrl})` : undefined,
        backgroundColor: bgMode === 'colour' ? (c.bgColor || 'var(--sf-secondary)') : (!hasImage ? 'var(--sf-secondary)' : undefined),
        minHeight: c.height || '600px',
      };
      const titleStyle: React.CSSProperties = {
        fontFamily: c.titleFont ? `'${c.titleFont}', sans-serif` : undefined,
        color: c.titleColor || '#ffffff',
        fontWeight: c.titleFontWeight || 900,
        fontSize: c.titleFontSize ? `${c.titleFontSize}px` : undefined,
      };
      const subtitleStyle: React.CSSProperties = {
        color: c.subtitleColor || undefined,
        fontSize: c.subtitleFontSize ? `${c.subtitleFontSize}px` : undefined,
      };
      const buttons = Array.isArray(c.buttons) ? c.buttons : (c.ctaText ? [{ text: c.ctaText, link: c.ctaLink, bgColor: c.ctaBgColor, textColor: c.ctaTextColor, radius: c.ctaRadius, size: c.ctaSize, fontSize: c.ctaFontSize }] : []);
      const ctaSizePadding: Record<string, string> = { sm: '0.75rem 1.5rem', md: '1.25rem 3.5rem', lg: '1.5rem 4rem' };

      return (
        <div className="sf-block-hero" style={heroStyle}>
          <div className="sf-block-hero-overlay" style={{
            opacity: c.overlayOpacity ?? 0.4,
            backgroundColor: c.overlayColor || undefined,
          }} />
          <div className="sf-block-hero-content">
            <h1 style={titleStyle}>{c.title}</h1>
            {c.subtitle && <p style={subtitleStyle}>{c.subtitle}</p>}
            {buttons.length > 0 && (
              <div style={{ display: 'flex', gap: `${c.buttonSpacing ?? 16}px`, justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
                {buttons.map((btn: any, i: number) => (
                  <Link key={i} to={btn.link || '/shop/products'} className="sf-hero-cta" style={{
                    backgroundColor: btn.bgColor || undefined,
                    color: btn.textColor || '#ffffff',
                    borderRadius: btn.radius != null ? `${btn.radius}px` : undefined,
                    padding: ctaSizePadding[btn.size || 'md'],
                    fontSize: btn.fontSize ? `${btn.fontSize}px` : undefined,
                  }}>{btn.text}</Link>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'half_hero': {
      const bgMode = c.bgMode || 'image';
      const hasImage = bgMode === 'image' && c.imageUrl;
      const bgStyle: React.CSSProperties = {
        height: c.height || '600px',
        backgroundColor: bgMode === 'colour' ? (c.bgColor || 'var(--sf-secondary)') : (!hasImage ? 'var(--sf-secondary)' : undefined),
      };
      const cardBgHex = c.cardBgColor || '#000000';
      const cardBgOpacity = c.cardBgOpacity ?? 0.4;
      // Convert hex to rgba
      const hexToRgba = (hex: string, alpha: number) => {
        const h = hex.replace('#', '');
        const r = parseInt(h.substring(0, 2), 16) || 0;
        const g = parseInt(h.substring(2, 4), 16) || 0;
        const b = parseInt(h.substring(4, 6), 16) || 0;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };
      const cardStyle: React.CSSProperties = {
        backgroundColor: hexToRgba(cardBgHex, cardBgOpacity),
        borderRadius: c.cardRadius != null ? `${c.cardRadius}px` : undefined,
        backdropFilter: c.cardBlur !== false ? `blur(${c.cardBlurAmount || 10}px)` : undefined,
        WebkitBackdropFilter: c.cardBlur !== false ? `blur(${c.cardBlurAmount || 10}px)` : undefined,
      };
      const titleStyle: React.CSSProperties = {
        fontFamily: c.titleFont ? `'${c.titleFont}', sans-serif` : undefined,
        color: c.titleColor || '#ffffff',
        fontWeight: c.titleFontWeight || 900,
        fontSize: c.titleFontSize ? `${c.titleFontSize}px` : undefined,
      };
      const ctaSizePadding: Record<string, string> = { sm: '0.625rem 1.25rem', md: '1rem 2.5rem', lg: '1.25rem 3.5rem' };
      const ctaBgColor = c.ctaBgColor || 'var(--sf-primary)';
      const ctaTextColor = c.ctaTextColor || '#ffffff';
      const ctaRadius = c.ctaRadius != null ? `${c.ctaRadius}px` : '8px';
      const defaultCtaFontSize: Record<string, string> = { sm: '0.8125rem', md: '1rem', lg: '1.125rem' };

      return (
        <div className="sf-block-half-hero" style={bgStyle}>
          {hasImage && (
            <img
              src={c.imageUrl}
              alt={c.title || 'Hero'}
              className="sf-half-hero-img"
              style={{
                objectPosition: c.objectPosition || 'center',
                opacity: c.imageOpacity != null ? c.imageOpacity : 0.85,
              }}
            />
          )}
          {(hasImage && c.overlayOpacity > 0) && (
            <div
              className="sf-half-hero-overlay"
              style={{ backgroundColor: c.overlayColor || '#000000', opacity: c.overlayOpacity || 0 }}
            />
          )}
          {(c.title || c.subtitle || c.ctaText) && (
            <div className="sf-half-hero-content" style={cardStyle}>
              {c.title && <h2 style={titleStyle}>{c.title}</h2>}
              {c.subtitle && <p className="sf-half-hero-subtitle" style={{ color: c.subtitleColor || undefined, fontSize: c.subtitleFontSize ? `${c.subtitleFontSize}px` : undefined }}>{c.subtitle}</p>}
              {c.ctaText && (
                <Link
                  to={c.ctaLink || '#'}
                  className="sf-half-hero-cta"
                  style={{
                    backgroundColor: ctaBgColor,
                    color: ctaTextColor,
                    borderRadius: ctaRadius,
                    padding: ctaSizePadding[c.ctaSize || 'md'],
                    fontSize: c.ctaFontSize ? `${c.ctaFontSize}px` : defaultCtaFontSize[c.ctaSize || 'md'],
                  }}
                >
                  {c.ctaText}
                </Link>
              )}
            </div>
          )}
        </div>
      );
    }

    case 'heading': {
      const level = (c.level || 'h2') as 'h1' | 'h2' | 'h3' | 'h4';
      const headingStyle: React.CSSProperties = {
        fontFamily: c.fontFamily ? `'${c.fontFamily}', sans-serif` : undefined,
        fontSize: c.fontSize ? `${c.fontSize}px` : undefined,
        color: c.color || undefined,
        fontWeight: c.fontWeight ? Number(c.fontWeight) : undefined,
      };
      return (
        <div className="sf-block-heading" style={{ textAlign: c.align || 'center' }}>
          {React.createElement(level, { style: headingStyle }, c.text)}
        </div>
      );
    }

    case 'text':
      return (
        <div className="sf-block-text" style={{ textAlign: c.align || 'left' }}>
          <p>{c.text}</p>
        </div>
      );

    case 'image': {
      const getShadow = (s: string) => {
        if (s === 'sm') return '0 1px 2px 0 rgba(0,0,0,0.05)';
        if (s === 'md') return '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)';
        if (s === 'lg') return '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)';
        return 'none';
      };

      const imgStyle: React.CSSProperties = {
        maxWidth: c.width || '100%',
        borderRadius: c.borderRadius ? `${c.borderRadius}px` : undefined,
        boxShadow: getShadow(c.shadow || 'none'),
        opacity: typeof c.opacity === 'number' ? c.opacity / 100 : 1,
        transition: 'opacity 0.2s, box-shadow 0.2s',
        display: 'inline-block'
      };

      const imgElement = c.url ? (
        <img src={c.url} alt={c.alt || ''} style={imgStyle} />
      ) : (
        <div className="sf-block-image-placeholder">No image set</div>
      );

      return (
        <div className="sf-block-image" style={{ textAlign: c.align || 'center' }}>
          {c.link ? (
            <Link to={c.link} style={{ display: 'inline-block' }}>
              {imgElement}
            </Link>
          ) : (
            imgElement
          )}
        </div>
      );
    }

    case 'image_gallery': {
      const getShadow = (s: string) => {
        if (s === 'sm') return '0 1px 2px 0 rgba(0,0,0,0.05)';
        if (s === 'md') return '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)';
        if (s === 'lg') return '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)';
        return 'none';
      };

      const layout = c.layout || 'grid';
      const gap = c.gap ?? 16;
      const columns = c.columns || 3;
      const images: string[] = Array.isArray(c.images) ? c.images : [];

      let containerStyle: React.CSSProperties = {};
      if (layout === 'masonry') {
        containerStyle = { columnCount: columns, columnGap: `${gap}px` };
      } else if (layout === 'bento') {
        containerStyle = {
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridAutoRows: '200px',
          gap: `${gap}px`,
          gridAutoFlow: 'dense'
        };
      } else {
        containerStyle = {
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`
        };
      }

      const getAspectMapping = (ratio: string) => {
        if (ratio === 'square') return '1/1';
        if (ratio === 'portrait') return '3/4';
        if (ratio === 'landscape') return '4/3';
        return undefined; // auto
      };

      const arStyle = layout === 'masonry' ? undefined : getAspectMapping(c.aspectRatio || 'square');

      return (
        <div className={`sf-block-gallery sf-layout-${layout}`} style={containerStyle}>
          {images.map((url: string, i: number) => {
            let itemStyle: React.CSSProperties = {
              display: 'block',
              width: '100%',
              objectFit: 'cover',
              height: layout === 'masonry' ? 'auto' : '100%',
              aspectRatio: arStyle,
              borderRadius: c.borderRadius ? `${c.borderRadius}px` : undefined,
              boxShadow: getShadow(c.shadow || 'none'),
              marginBottom: layout === 'masonry' ? `${gap}px` : 0,
              breakInside: 'avoid',
            };

            if (layout === 'bento') {
              const isFeatured = i % 5 === 0;
              itemStyle = {
                ...itemStyle,
                gridColumn: isFeatured ? 'span 2' : 'span 1',
                gridRow: isFeatured ? 'span 2' : 'span 1',
              };
            }

            return (
              <img
                key={i}
                src={url}
                alt={`Gallery image ${i + 1}`}
                style={itemStyle}
              />
            );
          })}
        </div>
      );
    }

    case 'button': {
      const btnStyle: React.CSSProperties = {
        fontFamily: c.fontFamily ? `'${c.fontFamily}', sans-serif` : undefined,
        fontSize: c.fontSize ? `${c.fontSize}px` : undefined,
        fontWeight: c.fontWeight ? Number(c.fontWeight) : undefined,
        color: c.textColor || undefined,
        backgroundColor: c.bgColor || undefined,
        borderColor: c.bgColor || undefined,
        borderRadius: c.borderRadius != null && c.borderRadius !== '' ? `${c.borderRadius}px` : undefined,
      };

      return (
        <div className="sf-block-button" style={{ textAlign: c.align || 'center' }}>
          <Link
            to={c.link || '#'}
            className={`sf-btn sf-btn-${c.style || 'primary'} sf-btn-${c.size || 'md'}`}
            style={btnStyle}
          >
            {c.text || 'Button'}
          </Link>
        </div>
      );
    }

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

    case 'divider': {
      const isFull = c.width === 'full';
      return (
        <div className="sf-block-divider" style={isFull ? { width: '100cqw', marginLeft: 'calc(-50cqw + 50%)' } : undefined}>
          <hr style={{ borderStyle: c.style || 'solid', borderColor: c.color || '#e5e7eb', borderWidth: `${c.thickness || 1}px 0 0 0` }} />
        </div>
      );
    }

    case 'video':
      return <VideoBlock config={c} />;

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

    case 'banner': {
      const mode = c.mode || 'static';
      const bgMode = c.bgMode || 'colour';
      const hasImage = bgMode === 'image' && !!c.imageUrl;
      
      const containerStyle: React.CSSProperties = {
        width: '100cqw',
        marginLeft: 'calc(-50cqw + 50%)',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: c.paddingTop !== undefined ? `${c.paddingTop}px` : '24px',
        paddingBottom: c.paddingBottom !== undefined ? `${c.paddingBottom}px` : '24px',
        borderWidth: c.borderWidth ? `${c.borderWidth}px` : undefined,
        borderStyle: c.borderWidth ? 'solid' : undefined,
        borderColor: c.borderColor || undefined,
        borderRadius: c.borderRadius ? `${c.borderRadius}px` : undefined,
        backgroundImage: hasImage ? `url(${c.imageUrl})` : undefined,
        backgroundColor: bgMode === 'colour' ? (c.bgColor || '#1a1a2e') : (!hasImage ? '#1a1a2e' : undefined),
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      };

      const overlayStyle: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        backgroundColor: c.overlayColor || '#000000',
        opacity: hasImage ? (c.overlayOpacity ?? 0.5) : 0,
        zIndex: 1,
      };

      const textStyle: React.CSSProperties = {
        position: 'relative',
        zIndex: 2,
        fontFamily: c.fontFamily ? `'${c.fontFamily}', sans-serif` : undefined,
        fontSize: c.fontSize ? `${c.fontSize}px` : '1.0625rem',
        fontWeight: c.fontWeight || 600,
        color: c.textColor || '#ffffff',
        textAlign: c.align || 'center',
        margin: 0,
        width: '100%',
        whiteSpace: mode === 'ticker' ? 'nowrap' : 'normal',
      };

      if (mode === 'ticker') {
        const speed = c.speed || 30;
        return (
          <div className="sf-block-banner" style={containerStyle}>
            {hasImage && <div style={overlayStyle} />}
            <div className="sf-ticker-track" style={{ ...textStyle, animationDuration: `${speed}s`, display: 'flex' }}>
              {Array.from({ length: 15 }).map((_, i) => (
                <span key={i} className="sf-ticker-item" style={{ padding: '0 2rem' }}>{c.text}</span>
              ))}
            </div>
          </div>
        );
      }

      return (
        <div className="sf-block-banner" style={containerStyle}>
          {hasImage && <div style={overlayStyle} />}
          <div style={textStyle}>
            {c.text}
          </div>
        </div>
      );
    }

    case 'ticker':
      return (
        <div className="sf-block-ticker" style={{ backgroundColor: c.bgColor || '#000000', color: c.textColor || '#ffffff' }}>
          <div className="sf-ticker-track" style={{ animationDuration: `${c.speed || 30}s` }}>
            {Array.from({ length: 15 }).map((_, i) => (
              <span key={i} className="sf-ticker-item">{c.text}</span>
            ))}
          </div>
        </div>
      );

    case 'features':
      return (
        <div className="sf-block-features">
          {(c.items || []).map((item: any, i: number) => {
            // dynamically get Icon component from string name
            // fall back to default icon or null if not found
            let IconComponent: any = null;
            if (item.icon) {
              const camelName = item.icon.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
              IconComponent = (Icons as any)[camelName] || (Icons as any)[item.icon.charAt(0).toUpperCase() + item.icon.slice(1)];
            }
            if (!IconComponent) IconComponent = Icons.Star;

            return (
              <div key={i} className="sf-feature-card">
                <div className="sf-feature-icon-wrap">
                  <IconComponent size={32} />
                </div>
                <h4 className="sf-feature-title">{item.title}</h4>
                <p className="sf-feature-desc">{item.description}</p>
              </div>
            );
          })}
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

function VideoBlock({ config: c }: { config: Record<string, any> }) {
  const source = c.source || 'url';
  const url = c.url || '';
  const autoplay = c.autoplay || false;
  const muted = c.muted !== undefined ? c.muted : false;
  const controls = c.controls !== undefined ? c.controls : true;

  const getEmbedUrl = (input: string) => {
    const ytMatch = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) {
      const params = new URLSearchParams();
      if (autoplay) { params.set('autoplay', '1'); params.set('mute', '1'); }
      else if (muted) { params.set('mute', '1'); }
      if (!controls) { params.set('controls', '0'); }
      return `https://www.youtube.com/embed/${ytMatch[1]}?${params.toString()}`;
    }
    const vimeoMatch = input.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      const params = new URLSearchParams();
      if (autoplay) { params.set('autoplay', '1'); params.set('muted', '1'); }
      else if (muted) { params.set('muted', '1'); }
      if (!controls) { params.set('controls', '0'); }
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?${params.toString()}`;
    }
    return input;
  };

  if (!url) return <div className="sf-block-image-placeholder">No video URL set</div>;

  if (source === 'url') {
    return (
      <div className="sf-block-video">
        <iframe src={getEmbedUrl(url)} allowFullScreen allow="autoplay" title="Video" />
      </div>
    );
  }

  return <CustomVideoPlayer src={url} autoplay={autoplay} defaultMuted={muted} showControls={controls} />;
}

function CustomVideoPlayer({ src, autoplay, defaultMuted, showControls }: { src: string; autoplay: boolean; defaultMuted: boolean; showControls: boolean; }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(autoplay);
  const [muted, setMuted] = useState(defaultMuted || autoplay);
  const [progress, setProgress] = useState(0);

  // Sync builder changes dynamically
  useEffect(() => {
    setPlaying(autoplay);
    if (videoRef.current) {
      if (autoplay) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  }, [autoplay, src]);

  useEffect(() => {
    const isMuted = defaultMuted || autoplay;
    setMuted(isMuted);
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [defaultMuted, autoplay]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch((err) => console.error("Video play failed:", err));
    }
    setPlaying(!playing);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(p || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const time = (Number(e.target.value) / 100) * videoRef.current.duration;
    videoRef.current.currentTime = time;
    setProgress(Number(e.target.value));
  };

  return (
    <div className="sf-custom-video-wrapper" style={{ position: 'relative', width: '100%', borderRadius: 8, overflow: 'hidden', background: '#000', cursor: showControls ? 'pointer' : 'default' }} onClick={(e) => { if (showControls) togglePlay(e); }}>
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoplay}
        muted={muted}
        playsInline
        loop={autoplay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
        style={{ width: '100%', display: 'block', pointerEvents: 'auto' }}
      />
      {showControls && (
        <div className="sf-custom-video-controls" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: 100, backdropFilter: 'blur(10px)', transition: 'background 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 50, pointerEvents: 'auto' }}>
          <button type="button" onClick={togglePlay} onMouseDown={(e) => e.stopPropagation()} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            {playing ? <Icons.Pause size={18} fill="currentColor" /> : <Icons.Play size={18} fill="currentColor" />}
          </button>
          
          <input type="range" min="0" max="100" value={progress} onChange={handleSeek} onMouseDown={(e) => e.stopPropagation()} style={{ flex: 1, accentColor: 'var(--brand-danger, #dc2626)', cursor: 'pointer', height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
          
          <button type="button" onClick={toggleMute} onMouseDown={(e) => e.stopPropagation()} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            {muted ? <Icons.VolumeX size={18} /> : <Icons.Volume2 size={18} />}
          </button>
        </div>
      )}
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
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    api.fetchCollections()
      .then(all => {
        let selected: Collection[] = [];
        if (config.collectionIds && config.collectionIds.length > 0) {
          selected = config.collectionIds.map((id: string) => all.find(c => c.id === id)).filter(Boolean) as Collection[];
        } else {
          selected = all;
        }
        setCollections(selected.slice(0, config.limit || 3));
      })
      .catch(console.error);
  }, [config.collectionIds, config.limit]);

  const cols = config.columns || 3;
  const stackOnMobile = config.stackOnMobile ?? true;
  const aspectRatio = config.aspectRatio || 'auto';
  const textPosition = config.textPosition || 'below';

  const cardStyle: React.CSSProperties = {
    backgroundColor: config.bgColor || undefined,
    borderColor: config.borderColor || undefined,
    borderWidth: config.borderColor ? '1px' : undefined,
    borderStyle: config.borderColor ? 'solid' : undefined,
    borderRadius: config.borderRadius ? `${config.borderRadius}px` : undefined,
    padding: (config.bgColor || config.borderColor) && textPosition === 'below' ? '1rem' : undefined,
  };

  const titleStyle: React.CSSProperties = {
    color: config.titleColor || undefined,
  };

  const ctaStyle = config.ctaStyle || 'link';
  const hoverClass = (config.hoverEffect ?? true) ? 'hover-lift' : '';

  const renderCta = () => {
    if (ctaStyle === 'link') {
      return <span className="sf-catlink-cta" style={config.ctaColor ? { color: config.ctaColor, borderColor: config.ctaColor } : {}}>
        {config.ctaText || 'SHOP NOW'}
      </span>;
    }
    const isPrimary = ctaStyle === 'primary';
    const btnClass = isPrimary ? 'sf-btn-primary' : 'sf-btn-secondary';
    const colorStyle = config.ctaColor 
      ? (isPrimary ? { backgroundColor: config.ctaColor, borderColor: config.ctaColor, color: '#fff' } : { color: config.ctaColor, borderColor: config.ctaColor })
      : {};
    return <span className={`sf-btn ${btnClass}`} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', marginTop: '0.5rem', ...colorStyle }}>
      {config.ctaText || 'SHOP NOW'}
    </span>;
  };

  return (
    <div className={`sf-category-links pos-${textPosition} ${stackOnMobile ? 'stack-mobile' : ''}`} style={{ 
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      paddingTop: config.paddingTop !== undefined ? `${config.paddingTop}px` : undefined,
      paddingRight: config.paddingRight !== undefined ? `${config.paddingRight}px` : undefined,
      paddingBottom: config.paddingBottom !== undefined ? `${config.paddingBottom}px` : undefined,
      paddingLeft: config.paddingLeft !== undefined ? `${config.paddingLeft}px` : undefined,
      marginTop: config.marginTop !== undefined ? `${config.marginTop}px` : undefined,
      marginRight: config.marginRight !== undefined ? `${config.marginRight}px` : undefined,
      marginBottom: config.marginBottom !== undefined ? `${config.marginBottom}px` : undefined,
      marginLeft: config.marginLeft !== undefined ? `${config.marginLeft}px` : undefined,
    }}>
      {collections.map((col: Collection, i: number) => (
        <Link key={col.id || i} to={`/shop/collections/${col.slug || col.id}`} className={`sf-catlink-card ${hoverClass}`} style={cardStyle}>
          <div className={`sf-catlink-img-wrap aspect-${aspectRatio}`} style={{ borderRadius: config.borderRadius ? `${textPosition === 'overlay' ? config.borderRadius : Math.max(0, config.borderRadius - 4)}px` : undefined, marginBottom: textPosition === 'below' ? '1rem' : '0' }}>
            {col.cover_image_url && <img src={col.cover_image_url} alt={col.name} className={`sf-catlink-img aspect-${aspectRatio}`} />}
            {textPosition === 'overlay' && (
              <div className="sf-catlink-content sf-catlink-overlay-content">
                <h3 className="sf-catlink-title" style={titleStyle}>{col.name}</h3>
                {renderCta()}
              </div>
            )}
          </div>
          {textPosition === 'below' && (
            <div className="sf-catlink-content sf-catlink-below-content">
              <h3 className="sf-catlink-title" style={titleStyle}>{col.name}</h3>
              {renderCta()}
            </div>
          )}
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
