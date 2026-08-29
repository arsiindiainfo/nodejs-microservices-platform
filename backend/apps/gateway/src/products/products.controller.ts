// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  callTcpService,
  CreateProductDto,
  PaginationQueryDto,
  Role,
  Roles,
  ServiceName,
  PRODUCT_PATTERNS,
  UpdateProductDto,
} from '@app/common';
import type { PaginatedResult, ProductSummary, TcpMeta } from '@app/common';
import { RequestMeta } from '../common/request-meta.decorator';

/** §18 — reverse-proxies to product-service over TCP. */
@Controller('products')
export class ProductsController {
  constructor(
    @Inject('PRODUCT_SERVICE') private readonly productClient: ClientProxy,
  ) {}

  @Get()
  list(
    @Query() query: PaginationQueryDto,
    @RequestMeta() meta: TcpMeta,
  ): Promise<PaginatedResult<ProductSummary>> {
    return callTcpService(
      this.productClient,
      PRODUCT_PATTERNS.LIST,
      query,
      meta,
      ServiceName.PRODUCT_SERVICE,
    );
  }

  @Get(':id')
  findById(
    @Param('id') productId: string,
    @RequestMeta() meta: TcpMeta,
  ): Promise<ProductSummary> {
    return callTcpService(
      this.productClient,
      PRODUCT_PATTERNS.FIND_BY_ID,
      { productId },
      meta,
      ServiceName.PRODUCT_SERVICE,
    );
  }

  @Roles(Role.ADMIN)
  @Post()
  create(
    @Body() dto: CreateProductDto,
    @RequestMeta() meta: TcpMeta,
  ): Promise<ProductSummary> {
    return callTcpService(
      this.productClient,
      PRODUCT_PATTERNS.CREATE,
      dto,
      meta,
      ServiceName.PRODUCT_SERVICE,
    );
  }

  @Roles(Role.ADMIN)
  @Put(':id')
  update(
    @Param('id') productId: string,
    @Body() dto: UpdateProductDto,
    @RequestMeta() meta: TcpMeta,
  ): Promise<ProductSummary> {
    return callTcpService(
      this.productClient,
      PRODUCT_PATTERNS.UPDATE,
      { productId, ...dto },
      meta,
      ServiceName.PRODUCT_SERVICE,
    );
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(
    @Param('id') productId: string,
    @RequestMeta() meta: TcpMeta,
  ): Promise<{ deleted: true }> {
    return callTcpService(
      this.productClient,
      PRODUCT_PATTERNS.DELETE,
      { productId },
      meta,
      ServiceName.PRODUCT_SERVICE,
    );
  }
}
