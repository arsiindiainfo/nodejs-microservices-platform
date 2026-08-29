// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import {
  callTcpService,
  InvalidTransitionException,
  OrderNotFoundException,
  OrderStatus,
  PaginatedResult,
  ServiceName,
  PRODUCT_PATTERNS,
} from '@app/common';
import type {
  OrderDetail,
  OrderItemInputDto,
  OrderItemView,
  OrderSummary,
  ReservedStockLine,
  TcpMeta,
} from '@app/common';
import {
  OrdersRepository,
  RawOrderDetailRow,
  RawOrderListRow,
} from './orders.repository';

interface RequestingUser {
  userId: string;
  isAdmin: boolean;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    @Inject('PRODUCT_SERVICE') private readonly productClient: ClientProxy,
  ) {}

  async create(
    customerId: string,
    items: OrderItemInputDto[],
    meta: TcpMeta,
  ): Promise<OrderDetail> {
    const reserved = await callTcpService<ReservedStockLine[]>(
      this.productClient,
      PRODUCT_PATTERNS.RESERVE_STOCK,
      { items },
      meta,
      ServiceName.PRODUCT_SERVICE,
    );

    const created = await this.ordersRepository.createOrder(
      customerId,
      reserved.map((line) => ({
        productId: line.productId,
        name: line.name,
        unitPrice: line.unitPrice,
        qty: line.quantity,
      })),
    );
    if (created.statusCode !== 'OK') {
      throw new Error(`usp_Order_Create failed: ${created.message}`);
    }

    await this.ordersRepository.confirmAwaitingPayment(created.orderId);

    const detail = await this.getById(created.orderId, {
      userId: customerId,
      isAdmin: false,
    });
    this.logger.log(
      `Order ${created.orderId} created for customer ${customerId}, awaiting payment.`,
    );
    return detail;
  }

  async list(
    requester: RequestingUser,
    filter: {
      status?: string;
      page: number;
      limit: number;
      sort?: string;
      direction?: string;
    },
  ): Promise<PaginatedResult<OrderSummary>> {
    const { rows, total } = await this.ordersRepository.list({
      customerId: requester.isAdmin ? null : requester.userId,
      status: filter.status ?? null,
      page: filter.page,
      limit: filter.limit,
      sortColumn: filter.sort === 'totalAmount' ? 'TotalAmount' : 'CreatedAt',
      sortDirection: filter.direction === 'asc' ? 'ASC' : 'DESC',
    });
    return {
      items: rows.map((row) => this.toSummary(row)),
      page: filter.page,
      limit: filter.limit,
      total,
    };
  }

  async getById(
    orderId: number,
    requester: RequestingUser,
  ): Promise<OrderDetail> {
    const row = await this.ordersRepository.getById(orderId);
    if (!row || (!requester.isAdmin && row.CustomerId !== requester.userId)) {
      throw new OrderNotFoundException(orderId);
    }
    const items: OrderItemView[] = row.ItemsJson
      ? (JSON.parse(row.ItemsJson) as Array<Record<string, unknown>>).map(
          (item) => ({
            productId: item.ProductId as string,
            productName: item.ProductNameSnapshot as string,
            unitPrice: Number(item.UnitPriceSnapshot),
            quantity: item.Quantity as number,
          }),
        )
      : [];
    return { ...this.toSummary(row), items };
  }

  async cancel(
    orderId: number,
    requester: RequestingUser,
  ): Promise<OrderDetail> {
    const result = await this.ordersRepository.cancel(
      orderId,
      requester.isAdmin ? null : requester.userId,
    );
    if (result.statusCode === 'INVALID_TRANSITION') {
      throw new InvalidTransitionException(result.message);
    }
    if (result.statusCode !== 'OK') {
      throw new Error(`usp_Order_Cancel failed: ${result.message}`);
    }
    return this.getById(orderId, requester);
  }

  /**
   * Consumed from payment-events (§11.2) by the SQS consumer. ALREADY_PROCESSED
   * and INVALID_TRANSITION are terminal outcomes of an idempotency/state check,
   * not transient failures — they're logged, not thrown, so the message is
   * acked rather than endlessly retried (§16). Only a genuine DB failure throws,
   * which leaves the message for SQS to redeliver (§12.3).
   */
  async applyPaymentResult(
    eventId: string,
    orderId: number,
    outcome: 'SUCCEEDED' | 'FAILED',
  ): Promise<void> {
    const result = await this.ordersRepository.applyPaymentResult(
      eventId ?? randomUUID(),
      orderId,
      outcome,
    );
    if (result.statusCode === 'INTERNAL_ERROR') {
      throw new Error(`usp_Order_ApplyPaymentResult failed: ${result.message}`);
    }
    if (result.statusCode !== 'OK') {
      this.logger.warn(
        `Payment result for order ${orderId} was a no-op: ${result.statusCode} — ${result.message}`,
      );
    }
  }

  async getCustomerIdForOrder(orderId: number): Promise<string> {
    const customerId = await this.ordersRepository.getCustomerId(orderId);
    if (!customerId) {
      throw new OrderNotFoundException(orderId);
    }
    return customerId;
  }

  async productHasNonTerminalOrder(productId: string): Promise<boolean> {
    return this.ordersRepository.productHasNonTerminalOrder(productId);
  }

  private toSummary(row: RawOrderListRow | RawOrderDetailRow): OrderSummary {
    return {
      id: row.OrderId,
      customerId: row.CustomerId,
      status: row.Status as OrderStatus,
      totalAmount: Number(row.TotalAmount),
      createdAt: new Date(row.CreatedAt).toISOString(),
      updatedAt: new Date(row.UpdatedAt).toISOString(),
    };
  }
}
