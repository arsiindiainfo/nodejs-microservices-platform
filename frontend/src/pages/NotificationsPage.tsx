import { useEffect, useState } from 'react';
import * as api from '../api/endpoints';
import type { NotificationView } from '../api/types';
import { SpinnerBlock } from '../components/Spinner';
import { Pagination } from '../components/Pagination';
import { isApiError } from '../api/client';

const PAGE_SIZE = 15;

const ICONS: Record<NotificationView['type'], { icon: string; cls: string }> = {
  ORDER_PLACED: { icon: '🧾', cls: 'order' },
  PAYMENT_SUCCEEDED: { icon: '✅', cls: 'success' },
  PAYMENT_FAILED: { icon: '⚠️', cls: 'failed' },
};

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        setLoading(true);
        return api.listNotifications({ page, limit: PAGE_SIZE });
      })
      .then((result) => {
        if (cancelled) return;
        setNotifications(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(isApiError(err) ? err.message : 'Could not load notifications.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  async function handleMarkRead(notification: NotificationView) {
    if (notification.read) return;
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    try {
      await api.markNotificationRead(notification.id);
    } catch {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: false } : n)));
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>Updates about your orders and payments.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <SpinnerBlock />
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔔</div>
          <h3>No notifications yet</h3>
          <p>Place an order to start seeing updates here.</p>
        </div>
      ) : (
        <>
          <div className="notif-list">
            {notifications.map((notification) => {
              const meta = ICONS[notification.type];
              return (
                <div
                  key={notification.id}
                  className={`notif-item${notification.read ? '' : ' unread'}`}
                  onClick={() => void handleMarkRead(notification)}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`notif-icon ${meta.cls}`}>{meta.icon}</div>
                  <div className="notif-body">
                    <div className="notif-msg">{notification.message}</div>
                    <div className="notif-time">{new Date(notification.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination page={page} limit={PAGE_SIZE} total={total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
