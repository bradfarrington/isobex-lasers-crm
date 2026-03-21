import { Outlet, Link, useLocation } from 'react-router-dom';
import { StoreConfigProvider, useStoreConfig } from './useStoreConfig';
import { CartProvider, useCart } from './useCart';
import { CartSidebar } from './CartSidebar';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import './StorefrontLayout.css';

function StorefrontShell() {
  const { config, loading } = useStoreConfig();
  const { cartCount, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  if (loading) {
    return <div className="sf-loading">Loading store...</div>;
  }

  const navLinks = config?.header_layout?.nav_links || [];
  const showAnnouncement = config?.announcement_bar_active && config?.announcement_bar_text;

  // Apply theme CSS vars
  const themeVars: Record<string, string> = {
    '--sf-primary': config?.color_primary || '#2563eb',
    '--sf-secondary': config?.color_secondary || '#1e40af',
    '--sf-accent': config?.color_accent || '#f59e0b',
    '--sf-bg': config?.color_background || '#ffffff',
    '--sf-surface': config?.color_surface || '#f8fafc',
    '--sf-text': config?.color_text || '#0f172a',
    '--sf-text-secondary': config?.color_text_secondary || '#64748b',
    '--sf-font-heading': config?.font_heading || 'Inter',
    '--sf-font-body': config?.font_body || 'Inter',
  };

  return (
    <div className="storefront" style={themeVars as React.CSSProperties}>
      {/* Announcement bar */}
      {showAnnouncement && (
        <div className="sf-announcement">
          {config!.announcement_bar_text}
        </div>
      )}

      {/* Header */}
      <header className="sf-header">
        <div className="sf-header-inner">
          <button className="sf-mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <Link to="/shop" className="sf-logo">
            {config?.logo_url ? (
              <img src={config.logo_url} alt={config.store_name} className="sf-logo-img" />
            ) : (
              <span className="sf-logo-text">{config?.store_name || 'Store'}</span>
            )}
          </Link>

          <nav className={`sf-nav ${menuOpen ? 'open' : ''}`}>
            <Link to="/shop" className="sf-nav-link">Home</Link>
            <Link to="/shop/products" className="sf-nav-link">Products</Link>
            <Link to="/shop/collections" className="sf-nav-link">Collections</Link>
            {navLinks.map((link, i) => (
              <Link key={i} to={link.url} className="sf-nav-link">{link.label}</Link>
            ))}
          </nav>

          <button className="sf-cart-btn" onClick={openCart}>
            <ShoppingCart size={22} />
            {cartCount > 0 && <span className="sf-cart-badge">{cartCount}</span>}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="sf-main">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="sf-footer">
        <div className="sf-footer-inner">
          <div className="sf-footer-columns">
            {(config?.footer_config?.columns || []).map((col, ci) => (
              <div className="sf-footer-column" key={ci}>
                <h4>{col.title}</h4>
                {col.links.map((link, li) => (
                  <Link key={li} to={link.url} className="sf-footer-link">{link.label}</Link>
                ))}
              </div>
            ))}
          </div>
          <div className="sf-footer-bottom">
            <div className="sf-footer-social">
              {(config?.footer_config?.social_links || []).map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="sf-social-link">
                  {link.platform}
                </a>
              ))}
            </div>
            <p className="sf-copyright">
              {config?.footer_config?.copyright || `© ${new Date().getFullYear()} ${config?.store_name}`}
            </p>
          </div>
        </div>
      </footer>

      {/* Cart sidebar */}
      <CartSidebar />
    </div>
  );
}

export function StorefrontLayout() {
  return (
    <StoreConfigProvider>
      <CartProvider>
        <StorefrontShell />
      </CartProvider>
    </StoreConfigProvider>
  );
}
