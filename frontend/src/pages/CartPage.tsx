import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { isApiError } from '../api/client';
import * as api from '../api/endpoints';

export function CartPage() {
  const { lines, totalAmount, updateQuantity, removeItem, clear } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setError(null);
    setPlacing(true);
    try {
      const order = await api.createOrder(lines.map((line) => ({ productId: line.productId, quantity: line.quantity })));
      clear();
      showToast('Order placed! Tracking payment now…', 'success');
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not place the order. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1>Your Cart</h1>
        </div>
        <div className="empty-state">
          <div className="icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Browse the catalog and add a few products to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Your Cart</h1>
        <p>{lines.length} item{lines.length === 1 ? '' : 's'}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {lines.map((line) => (
          <div key={line.productId} className="cart-row">
            <div className="cart-row-thumb">📦</div>
            <div className="cart-row-info">
              <div className="cart-row-name">{line.name}</div>
              <div className="cart-row-price">${line.price.toFixed(2)} each</div>
            </div>
            <div className="cart-row-qty">
              <button type="button" className="qty-btn" onClick={() => updateQuantity(line.productId, line.quantity - 1)}>
                −
              </button>
              <span>{line.quantity}</span>
              <button
                type="button"
                className="qty-btn"
                disabled={line.quantity >= line.stockQty}
                onClick={() => updateQuantity(line.productId, line.quantity + 1)}
              >
                +
              </button>
            </div>
            <div className="cart-row-total">${(line.price * line.quantity).toFixed(2)}</div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(line.productId)}>
              Remove
            </button>
          </div>
        ))}

        <div className="cart-summary-row total">
          <span>Total</span>
          <span>${totalAmount.toFixed(2)}</span>
        </div>

        <button type="button" className="btn btn-primary btn-block mt-24" disabled={placing} onClick={handleCheckout}>
          {placing ? 'Placing order…' : 'Place order'}
        </button>
      </div>
    </div>
  );
}
