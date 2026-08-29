// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { Model } from 'mongoose';
import {
  callTcpService,
  CreateProductDto,
  DuplicateSkuException,
  InsufficientStockException,
  InvalidTransitionException,
  PaginationQueryDto,
  ProductNotFoundException,
  ServiceName,
  ORDER_PATTERNS,
  UpdateProductDto,
} from '@app/common';
import type {
  PaginatedResult,
  ProductSummary,
  ReservedStockLine,
  ReserveStockItem,
  TcpMeta,
} from '@app/common';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
  ) {}

  async list(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<ProductSummary>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = query.search
      ? {
          $or: [
            { name: new RegExp(query.search, 'i') },
            { sku: new RegExp(query.search, 'i') },
          ],
        }
      : {};
    const sortField = query.sort ?? 'createdAt';
    const sortDirection = query.direction === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ [sortField]: sortDirection })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((item) => this.toSummary(item)),
      page,
      limit,
      total,
    };
  }

  async findById(productId: string): Promise<ProductSummary> {
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new ProductNotFoundException(productId);
    }
    return this.toSummary(product);
  }

  async create(dto: CreateProductDto): Promise<ProductSummary> {
    const existing = await this.productModel.findOne({ sku: dto.sku }).exec();
    if (existing) {
      throw new DuplicateSkuException(dto.sku);
    }
    const created = await this.productModel.create(dto);
    return this.toSummary(created);
  }

  async update(
    productId: string,
    dto: UpdateProductDto,
  ): Promise<ProductSummary> {
    const updated = await this.productModel
      .findByIdAndUpdate(productId, { $set: dto }, { new: true })
      .exec();
    if (!updated) {
      throw new ProductNotFoundException(productId);
    }
    return this.toSummary(updated);
  }

  /** Blocked if referenced by a non-terminal order (§18) — only order-service can answer that. */
  async remove(productId: string, meta: TcpMeta): Promise<void> {
    const existing = await this.productModel.findById(productId).exec();
    if (!existing) {
      throw new ProductNotFoundException(productId);
    }

    const { hasNonTerminalOrder } = await callTcpService<{
      hasNonTerminalOrder: boolean;
    }>(
      this.orderClient,
      ORDER_PATTERNS.HAS_NON_TERMINAL_ORDER_FOR_PRODUCT,
      { productId },
      meta,
      ServiceName.ORDER_SERVICE,
    );
    if (hasNonTerminalOrder) {
      throw new InvalidTransitionException(
        `${existing.name} is referenced by an order that hasn't completed yet and cannot be deleted.`,
      );
    }

    await this.productModel.findByIdAndDelete(productId).exec();
  }

  /**
   * Atomically decrements stock per line item so a concurrent order can never
   * push a product below zero (§19). If any later line fails — not found or
   * insufficient stock — the lines already reserved in this call are put back
   * before the error surfaces, so a partially-reservable cart never succeeds.
   */
  async reserveStock(items: ReserveStockItem[]): Promise<ReservedStockLine[]> {
    const reserved: ReservedStockLine[] = [];
    try {
      for (const item of items) {
        const product = await this.productModel
          .findOneAndUpdate(
            { _id: item.productId, stockQty: { $gte: item.quantity } },
            { $inc: { stockQty: -item.quantity } },
            { new: false },
          )
          .exec();

        if (!product) {
          const existing = await this.productModel
            .findById(item.productId)
            .exec();
          if (!existing) {
            throw new ProductNotFoundException(item.productId);
          }
          throw new InsufficientStockException(
            existing.name,
            existing.stockQty,
          );
        }

        reserved.push({
          productId: item.productId,
          name: product.name,
          unitPrice: product.price,
          quantity: item.quantity,
        });
      }
      return reserved;
    } catch (error) {
      await this.compensate(reserved);
      throw error;
    }
  }

  private async compensate(reserved: ReservedStockLine[]): Promise<void> {
    await Promise.all(
      reserved.map((line) =>
        this.productModel
          .updateOne(
            { _id: line.productId },
            { $inc: { stockQty: line.quantity } },
          )
          .exec(),
      ),
    );
  }

  private toSummary(product: ProductDocument): ProductSummary {
    return {
      id: product._id.toString(),
      sku: product.sku,
      name: product.name,
      price: product.price,
      stockQty: product.stockQty,
      createdAt: (product.createdAt ?? new Date()).toISOString(),
      updatedAt: (product.updatedAt ?? new Date()).toISOString(),
    };
  }
}
