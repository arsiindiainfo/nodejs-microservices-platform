// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  JwtVerificationGuard,
  OrderIdDto,
  PAYMENT_PATTERNS,
  RolesGuard,
  RpcExceptionFilter,
  validateDto,
} from '@app/common';
import type { PaymentStatusView, TcpEnvelope } from '@app/common';
import { PaymentsService } from './payments.service';

@UseFilters(RpcExceptionFilter)
@UseGuards(JwtVerificationGuard, RolesGuard)
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @MessagePattern(PAYMENT_PATTERNS.FIND_BY_ORDER_ID)
  async findByOrderId(
    @Payload() envelope: TcpEnvelope<OrderIdDto>,
  ): Promise<PaymentStatusView> {
    const dto = await validateDto(OrderIdDto, envelope.data);
    return this.paymentsService.findByOrderId(dto.orderId);
  }
}
