import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api/endpoints';
import type { OrderDetail, PaymentStatusView } from '../api/types';
import { SpinnerBlock, Spinner } from '../components/Spinner';
import { OrderStatusBadge, PaymentStatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { isApiError } from '../api/client';

const POLLING_STATUSES = new Set(['PENDING', 'AWAITING_PAYMENT']);
const POLL_INTERVAL_MS = 2000;

const STATUS_COPY: Record<string, { icon: string; title: string; sub: string }> = {
  PENDING: { icon: '⏳', title: 'Setting up your order…', sub: 'This only takes a moment.' },
  AWAITING_PAYMENT: { icon: '💳', title: 'Processing payment…', sub: 'We\'ll update this automatically — no need to refresh.' },
  PAID: { icon: '✅', title: 'Payment successful', sub: 'Your order is complete.' },
  PAYMENT_FAILED: { icon: '⚠️', title: 'Payment failed', sub: 'The simulated payment provider declined this order.' },
  CANCELLED: { icon: '🚫', title: 'Order cancelled', sub: 'This order was cancelled before it completed.' },
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const { showToast } = useToast();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [payment, setPayment] = useState<PaymentStatusView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const detail = await api.getOrder(orderId);
      setOrder(detail);
      setError(null);
      if (!POLLING_STATUSES.has(detail.status)) {
        try {
          const paymentInfo = await api.getOrderPayment(orderId);
          setPayment(paymentInfo);
        } catch {
          // payment record may not exist yet for a cancelled order — non-fatal
        }
      }
      return detail;
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load this order.');
      return null;
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      const detail = await fetchOrder();
      if (cancelled) return;
      setLoading(false);
      if (detail && POLLING_STATUSES.has(detail.status)) {
        timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [fetchOrder]);

  async function handleCancel() {
    setCancelling(true);
    try {
      const updated = await api.cancelOrder(orderId);
      setOrder(updated);
      showToast('Order cancelled.', 'success');
    } catch (err) {
      showToast(isApiError(err) ? err.message : 'Could not cancel this order.', 'error');
    } finally {
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  }

  if (loading) return <SpinnerBlock />;

  if (error && !order) {
    return (
      <div>
        <div className="alert alert-error">{error}</div>
        <Link to="/orders" className="btn btn-secondary mt-16">Back to orders</Link>
      </div>
    );
  }

  if (!order) return null;

  const copy = STATUS_COPY[order.status];
  const canCancel = POLLING_STATUSES.has(order.status);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Order #{order.id}</h1>
          <p>Placed {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <Link to="/orders" className="btn btn-secondary btn-sm">Back to orders</Link>
      </div>

      <div className="order-status-hero">
        <div className="icon-circle">{POLLING_STATUSES.has(order.status) ? <Spinner small /> : copy.icon}</div>
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.sub}</p>
        </div>
      </div>

      <div className="order-meta-grid">
        <div className="order-meta-cell">
          <div className="lbl">Status</div>
          <div className="val"><OrderStatusBadge status={order.status} /></div>
        </div>
        <div className="order-meta-cell">
          <div className="lbl">Total</div>
          <div className="val">${order.totalAmount.toFixed(2)}</div>
        </div>
        {payment && (
          <div className="order-meta-cell">
            <div className="lbl">Payment</div>
            <div className="val"><PaymentStatusBadge status={payment.status} /></div>
          </div>
        )}
        <div className="order-meta-cell">
          <div className="lbl">Last updated</div>
          <div className="val">{new Date(order.updatedAt).toLocaleTimeString()}</div>
        </div>
      </div>

      {payment?.failureReason && (
        <div className="alert alert-error">Payment failure reason: {payment.failureReason}</div>
      )}

      <div className="card">
        <div className="section-title">Items</div>
        {order.items.map((item) => (
          <div key={item.productId} className="order-line">
            <div>
              <div className="name">{item.productName}</div>
              <div className="meta">${item.unitPrice.toFixed(2)} × {item.quantity}</div>
            </div>
            <div>${(item.unitPrice * item.quantity).toFixed(2)}</div>
          </div>
        ))}
      </div>

      {canCancel && (
        <button type="button" className="btn btn-danger mt-16" onClick={() => setShowCancelConfirm(true)}>
          Cancel order
        </button>
      )}

      {showCancelConfirm && (
        <ConfirmDialog
          title="Cancel this order?"
          body="This can't be undone. If payment has already completed, cancellation will be rejected."
          confirmLabel="Cancel order"
          danger
          busy={cancelling}
          onConfirm={handleCancel}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}

      {error && <div className="alert alert-error mt-16">{error}</div>}
    </div>
  );
}
