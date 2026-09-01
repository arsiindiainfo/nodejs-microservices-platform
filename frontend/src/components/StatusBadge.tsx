import type { OrderStatus, PaymentStatus } from '../api/types';

const ORDER_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  AWAITING_PAYMENT: 'Awaiting Payment',
  PAID: 'Paid',
  PAYMENT_FAILED: 'Payment Failed',
  CANCELLED: 'Cancelled',
};

const ORDER_CLASSES: Record<OrderStatus, string> = {
  PENDING: 'badge-pending',
  AWAITING_PAYMENT: 'badge-awaiting',
  PAID: 'badge-paid',
  PAYMENT_FAILED: 'badge-failed',
  CANCELLED: 'badge-cancelled',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge ${ORDER_CLASSES[status]}`}>{ORDER_LABELS[status]}</span>;
}

const PAYMENT_CLASSES: Record<PaymentStatus, string> = {
  PENDING: 'badge-pending',
  SUCCEEDED: 'badge-succeeded',
  FAILED: 'badge-failed',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={`badge ${PAYMENT_CLASSES[status]}`}>{status}</span>;
}

export function RoleBadge({ role }: { role: 'ADMIN' | 'CUSTOMER' }) {
  return <span className={`badge ${role === 'ADMIN' ? 'badge-role-admin' : 'badge-role-customer'}`}>{role}</span>;
}
