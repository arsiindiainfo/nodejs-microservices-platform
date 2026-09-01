// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateProductDto,
  JwtVerificationGuard,
  PaginationQueryDto,
  ProductIdDto,
  ReserveStockDto,
  Role,
  Roles,
  RolesGuard,
  RpcExceptionFilter,
  PRODUCT_PATTERNS,
  UpdateProductDto,
  validateDto,
} from '@app/common';
import type {
  PaginatedResult,
  ProductSummary,
  ReservedStockLine,
  TcpEnvelope,
} from '@app/common';
import { ProductsService } from './products.service';

@UseFilters(RpcExceptionFilter)
@UseGuards(JwtVerificationGuard, RolesGuard)
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @MessagePattern(PRODUCT_PATTERNS.LIST)
  async list(
    @Payload() envelope: TcpEnvelope<PaginationQueryDto>,
  ): Promise<PaginatedResult<ProductSummary>> {
    const dto = await validateDto(PaginationQueryDto, envelope.data);
    return this.productsService.list(dto);
  }

  @MessagePattern(PRODUCT_PATTERNS.FIND_BY_ID)
  async findById(
    @Payload() envelope: TcpEnvelope<ProductIdDto>,
  ): Promise<ProductSummary> {
    const dto = await validateDto(ProductIdDto, envelope.data);
    return this.productsService.findById(dto.productId);
  }

  @Roles(Role.ADMIN)
  @MessagePattern(PRODUCT_PATTERNS.CREATE)
  async create(
    @Payload() envelope: TcpEnvelope<CreateProductDto>,
  ): Promise<ProductSummary> {
    const dto = await validateDto(CreateProductDto, envelope.data);
    return this.productsService.create(dto);
  }

  @Roles(Role.ADMIN)
  @MessagePattern(PRODUCT_PATTERNS.UPDATE)
  async update(
    @Payload() envelope: TcpEnvelope<{ productId: string } & UpdateProductDto>,
  ): Promise<ProductSummary> {
    const { productId, ...body } = envelope.data;
    const idDto = await validateDto(ProductIdDto, { productId });
    const dto = await validateDto(UpdateProductDto, body);
    return this.productsService.update(idDto.productId, dto);
  }

  @Roles(Role.ADMIN)
  @MessagePattern(PRODUCT_PATTERNS.DELETE)
  async remove(
    @Payload() envelope: TcpEnvelope<ProductIdDto>,
  ): Promise<{ deleted: true }> {
    const dto = await validateDto(ProductIdDto, envelope.data);
    await this.productsService.remove(dto.productId, envelope.meta);
    return { deleted: true };
  }

  @MessagePattern(PRODUCT_PATTERNS.RESERVE_STOCK)
  async reserveStock(
    @Payload() envelope: TcpEnvelope<ReserveStockDto>,
  ): Promise<ReservedStockLine[]> {
    const dto = await validateDto(ReserveStockDto, envelope.data);
    return this.productsService.reserveStock(dto.items);
  }
}
