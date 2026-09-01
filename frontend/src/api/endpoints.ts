import { apiRequest } from './client';
import type {
  AboutInfo,
  AuthSession,
  NotificationView,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  PaginatedResult,
  PaymentStatusView,
  Product,
  TokenPair,
  UserProfile,
} from './types';

// ---------- Auth ----------
export function register(input: { name: string; email: string; password: string; recaptchaToken: string }) {
  return apiRequest<AuthSession>('/auth/register', { method: 'POST', body: input, auth: false });
}

export function login(input: { email: string; password: string; recaptchaToken: string }) {
  return apiRequest<AuthSession>('/auth/login', { method: 'POST', body: input, auth: false });
}

export function refresh(refreshToken: string) {
  return apiRequest<TokenPair>('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false });
}

export function logout(refreshToken: string) {
  return apiRequest<{ loggedOut: true }>('/auth/logout', { method: 'POST', body: { refreshToken } });
}

// ---------- Users ----------
export function getMe() {
  return apiRequest<UserProfile>('/users/me');
}

// ---------- Products ----------
export function listProducts(params: { page?: number; limit?: number; search?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<PaginatedResult<Product>>(`/products${suffix}`);
}

export function getProduct(id: string) {
  return apiRequest<Product>(`/products/${id}`);
}

export function createProduct(input: { sku: string; name: string; price: number; stockQty: number }) {
  return apiRequest<Product>('/products', { method: 'POST', body: input });
}

export function updateProduct(id: string, input: Partial<{ name: string; price: number; stockQty: number }>) {
  return apiRequest<Product>(`/products/${id}`, { method: 'PUT', body: input });
}

export function deleteProduct(id: string) {
  return apiRequest<{ deleted: true }>(`/products/${id}`, { method: 'DELETE' });
}

// ---------- Orders ----------
export function createOrder(items: Array<{ productId: string; quantity: number }>) {
  return apiRequest<OrderDetail>('/orders', { method: 'POST', body: { items } });
}

export function listOrders(params: {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  sort?: 'createdAt' | 'totalAmount';
  direction?: 'asc' | 'desc';
} = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  if (params.sort) qs.set('sort', params.sort);
  if (params.direction) qs.set('direction', params.direction);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<PaginatedResult<OrderSummary>>(`/orders${suffix}`);
}

export function getOrder(id: number) {
  return apiRequest<OrderDetail>(`/orders/${id}`);
}

export function cancelOrder(id: number) {
  return apiRequest<OrderDetail>(`/orders/${id}/cancel`, { method: 'POST' });
}

export function getOrderPayment(id: number) {
  return apiRequest<PaymentStatusView>(`/orders/${id}/payment`);
}

// ---------- Notifications ----------
export function listNotifications(params: { page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<PaginatedResult<NotificationView>>(`/notifications${suffix}`);
}

export function markNotificationRead(id: string) {
  return apiRequest<{ read: true }>(`/notifications/${id}/read`, { method: 'POST' });
}

// ---------- Misc ----------
export function getAbout() {
  return apiRequest<AboutInfo>('/about', { auth: false });
}
