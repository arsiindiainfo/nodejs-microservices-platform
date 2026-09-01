export type Role = 'CUSTOMER' | 'ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  stockQty: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'PAYMENT_FAILED'
  | 'CANCELLED';

export interface OrderItemView {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderSummary {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDetail extends OrderSummary {
  items: OrderItemView[];
}

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

export interface PaymentStatusView {
  orderId: number;
  amount: number;
  status: PaymentStatus;
  providerReference: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'ORDER_PLACED'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED';

export interface NotificationView {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface AboutInfo {
  name: string;
  author: string;
  website: string;
  license: string;
  repository: string;
}
