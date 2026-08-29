// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { OrderStatus } from '../constants/order-status.enum';

export interface OrderItemView {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderSummary {
  id: number;
  customerId: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDetail extends OrderSummary {
  items: OrderItemView[];
}
