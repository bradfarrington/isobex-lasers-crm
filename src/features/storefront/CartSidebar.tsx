import { Link } from 'react-router-dom';
import { useCart } from './useCart';
import { useStoreConfig } from './useStoreConfig';
import { X, Trash2 } from 'lucide-react';

export function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, cartTotal } = useCart();
  const { formatPrice } = useStoreConfig();

  if (!isOpen) return null;

  return (
    <div className="cart-overlay">
      <div className="cart-backdrop" onClick={closeCart} />
      <div className="cart-panel">
        <div className="cart-header">
          <h3>Your Cart ({items.length})</h3>
          <button className="cart-close-btn" onClick={closeCart}>
            <X size={20} />
          </button>
        </div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              <p>Your cart is empty</p>
              <Link to="/shop/products" onClick={closeCart} className="sf-hero-cta" style={{ marginTop: '1rem', display: 'inline-block' }}>
                Start Shopping
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div className="cart-item" key={`${item.productId}-${item.variantId}`}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="cart-item-image" />
                ) : (
                  <div className="cart-item-image-placeholder" />
                )}
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  {item.variantLabel && <div className="cart-item-variant">{item.variantLabel}</div>}
                  <div className="cart-item-bottom">
                    <div className="cart-qty-controls">
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="cart-qty-val">{item.quantity}</span>
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <span className="cart-item-price">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
                <button
                  className="cart-item-remove"
                  onClick={() => removeItem(item.productId, item.variantId)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-subtotal">
              <span>Subtotal</span>
              <span>{formatPrice(cartTotal)}</span>
            </div>
            <Link to="/shop/checkout" className="cart-checkout-btn" onClick={closeCart}>
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
