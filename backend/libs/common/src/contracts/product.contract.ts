// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
export interface ProductSummary {
  id: string;
  sku: string;
  name: string;
  price: number;
  stockQty: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReserveStockItem {
  productId: string;
  quantity: number;
}

export interface ReservedStockLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}
