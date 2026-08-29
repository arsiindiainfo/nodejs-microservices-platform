// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
export interface NotificationView {
  id: string;
  type: 'ORDER_PLACED' | 'PAYMENT_SUCCEEDED' | 'PAYMENT_FAILED';
  message: string;
  read: boolean;
  createdAt: string;
}
