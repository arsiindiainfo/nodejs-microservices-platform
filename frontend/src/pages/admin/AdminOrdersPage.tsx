import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../api/endpoints';
import type { OrderStatus, OrderSummary } from '../../api/types';
import { SpinnerBlock } from '../../components/Spinner';
import { OrderStatusBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';
import { isApiError } from '../../api/client';

const PAGE_SIZE = 15;
const STATUS_FILTERS: Array<{ label: string; value: OrderStatus | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Awaiting Payment', value: 'AWAITING_PAYMENT' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Payment Failed', value: 'PAYMENT_FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        setLoading(true);
        return api.listOrders({ page, limit: PAGE_SIZE, status, sort: 'createdAt', direction: 'desc' });
      })
      .then((result) => {
        if (cancelled) return;
        setOrders(result.items);
        setTotal(result.total);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(isApiError(err) ? err.message : 'Could not load orders.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, status]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>All Orders</h1>
          <p>Every order placed by every customer.</p>
        </div>
      </div>

      <div className="tabs">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            className={status === filter.value ? 'active' : ''}
            onClick={() => {
              setStatus(filter.value);
              setPage(1);
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <SpinnerBlock />
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🧾</div>
          <h3>No orders found</h3>
        </div>
      ) : (
        <>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Placed</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td><OrderStatusBadge status={order.status} /></td>
                    <td>${order.totalAmount.toFixed(2)}</td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td>
                      <Link to={`/orders/${order.id}`} className="btn btn-ghost btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={PAGE_SIZE} total={total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
