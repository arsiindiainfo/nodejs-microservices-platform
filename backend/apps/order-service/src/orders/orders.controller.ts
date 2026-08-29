// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateOrderDto,
  OrderIdDto,
  OrderListQueryDto,
  ORDER_PATTERNS,
  ProductIdDto,
  Public,
  Role,
  RpcExceptionFilter,
  validateDto,
} from '@app/common';
import type {
  AuthenticatedUser,
  OrderDetail,
  OrderSummary,
  PaginatedResult,
  TcpEnvelope,
} from '@app/common';
import { OrdersService } from './orders.service';

interface AuthenticatedEnvelope<T> extends TcpEnvelope<T> {
  user?: AuthenticatedUser;
}

@UseFilters(RpcExceptionFilter)
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern(ORDER_PATTERNS.CREATE)
  async create(
    @Payload() envelope: AuthenticatedEnvelope<CreateOrderDto>,
  ): Promise<OrderDetail> {
    const dto = await validateDto(CreateOrderDto, envelope.data);
    return this.ordersService.create(
      envelope.user!.sub,
      dto.items,
      envelope.meta,
    );
  }

  @MessagePattern(ORDER_PATTERNS.LIST)
  async list(
    @Payload() envelope: AuthenticatedEnvelope<OrderListQueryDto>,
  ): Promise<PaginatedResult<OrderSummary>> {
    const dto = await validateDto(OrderListQueryDto, envelope.data);
    return this.ordersService.list(
      {
        userId: envelope.user!.sub,
        isAdmin: envelope.user!.role === Role.ADMIN,
      },
      {
        status: dto.status,
        page: dto.page ?? 1,
        limit: dto.limit ?? 20,
        sort: dto.sort,
        direction: dto.direction,
      },
    );
  }

  @MessagePattern(ORDER_PATTERNS.FIND_BY_ID)
  async findById(
    @Payload() envelope: AuthenticatedEnvelope<OrderIdDto>,
  ): Promise<OrderDetail> {
    const dto = await validateDto(OrderIdDto, envelope.data);
    return this.ordersService.getById(dto.orderId, {
      userId: envelope.user!.sub,
      isAdmin: envelope.user!.role === Role.ADMIN,
    });
  }

  @MessagePattern(ORDER_PATTERNS.CANCEL)
  async cancel(
    @Payload() envelope: AuthenticatedEnvelope<OrderIdDto>,
  ): Promise<OrderDetail> {
    const dto = await validateDto(OrderIdDto, envelope.data);
    return this.ordersService.cancel(dto.orderId, {
      userId: envelope.user!.sub,
      isAdmin: envelope.user!.role === Role.ADMIN,
    });
  }

  @MessagePattern(ORDER_PATTERNS.HAS_NON_TERMINAL_ORDER_FOR_PRODUCT)
  async hasNonTerminalOrderForProduct(
    @Payload() envelope: TcpEnvelope<ProductIdDto>,
  ): Promise<{ hasNonTerminalOrder: boolean }> {
    const dto = await validateDto(ProductIdDto, envelope.data);
    const hasNonTerminalOrder =
      await this.ordersService.productHasNonTerminalOrder(dto.productId);
    return { hasNonTerminalOrder };
  }

  // Public: called from notification-service's SQS consumer (no user JWT
  // exists in that background context) to resolve who a payment event's
  // orderId belongs to. Read-only, non-sensitive, never reachable from the
  // Gateway — see the migration's usp_Order_GetCustomerId comment.
  @Public()
  @MessagePattern(ORDER_PATTERNS.GET_CUSTOMER_ID_FOR_ORDER)
  async getCustomerIdForOrder(
    @Payload() envelope: TcpEnvelope<OrderIdDto>,
  ): Promise<{ customerId: string }> {
    const dto = await validateDto(OrderIdDto, envelope.data);
    const customerId = await this.ordersService.getCustomerIdForOrder(
      dto.orderId,
    );
    return { customerId };
  }
}
