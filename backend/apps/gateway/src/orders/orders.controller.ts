// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  callTcpService,
  CreateOrderDto,
  OrderListQueryDto,
  ServiceName,
  ORDER_PATTERNS,
  PAYMENT_PATTERNS,
} from '@app/common';
import type {
  OrderDetail,
  OrderSummary,
  PaginatedResult,
  PaymentStatusView,
  TcpMeta,
} from '@app/common';
import { RequestMeta } from '../common/request-meta.decorator';

/** §19 — reverse-proxies to order-service over TCP. */
@Controller('orders')
export class OrdersController {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
  ) {}

  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @RequestMeta() meta: TcpMeta,
  ): Promise<OrderDetail> {
    return callTcpService(
      this.orderClient,
      ORDER_PATTERNS.CREATE,
      dto,
      meta,
      ServiceName.ORDER_SERVICE,
    );
  }

  @Get()
  list(
    @Query() query: OrderListQueryDto,
    @RequestMeta() meta: TcpMeta,
  ): Promise<PaginatedResult<OrderSummary>> {
    return callTcpService(
      this.orderClient,
      ORDER_PATTERNS.LIST,
      query,
      meta,
      ServiceName.ORDER_SERVICE,
    );
  }

  /**
   * §19 — composes the order with a best-effort payment-status lookup. A
   * slow or unavailable payment-service degrades to `payment: null` rather
   * than failing the whole response (§24's "degraded-but-honest" rule).
   */
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) orderId: number,
    @RequestMeta() meta: TcpMeta,
  ): Promise<OrderDetail & { payment: PaymentStatusView | null }> {
    const order = await callTcpService<OrderDetail>(
      this.orderClient,
      ORDER_PATTERNS.FIND_BY_ID,
      { orderId },
      meta,
      ServiceName.ORDER_SERVICE,
    );
    const payment = await this.fetchPaymentBestEffort(orderId, meta);
    return { ...order, payment };
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) orderId: number,
    @RequestMeta() meta: TcpMeta,
  ): Promise<OrderDetail> {
    return callTcpService(
      this.orderClient,
      ORDER_PATTERNS.CANCEL,
      { orderId },
      meta,
      ServiceName.ORDER_SERVICE,
    );
  }

  @Get(':id/payment')
  async payment(
    @Param('id', ParseIntPipe) orderId: number,
    @RequestMeta() meta: TcpMeta,
  ): Promise<PaymentStatusView> {
    return callTcpService(
      this.paymentClient,
      PAYMENT_PATTERNS.FIND_BY_ORDER_ID,
      { orderId },
      meta,
      ServiceName.PAYMENT_SERVICE,
    );
  }

  private async fetchPaymentBestEffort(
    orderId: number,
    meta: TcpMeta,
  ): Promise<PaymentStatusView | null> {
    try {
      return await callTcpService<PaymentStatusView>(
        this.paymentClient,
        PAYMENT_PATTERNS.FIND_BY_ORDER_ID,
        { orderId },
        meta,
        ServiceName.PAYMENT_SERVICE,
        3000,
      );
    } catch {
      return null;
    }
  }
}
