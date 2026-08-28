export interface PaymentStatusView {
  orderId: number;
  amount: number;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  providerReference: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}
