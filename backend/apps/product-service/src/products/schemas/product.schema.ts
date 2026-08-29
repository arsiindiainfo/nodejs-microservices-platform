// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

/**
 * §9 — `products` { _id, sku (unique index), name, price, stockQty, createdAt, updatedAt }
 *
 * `_id` is a UUID string, not Mongo's default ObjectId — see the note on
 * user.schema.ts's `_id`; OrderItems.ProductId (§7.2) is UNIQUEIDENTIFIER.
 */
@Schema({
  collection: 'products',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class Product {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ required: true, unique: true, trim: true, index: true })
  sku: string;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 200 })
  name: string;

  @Prop({ required: true, min: 0.01 })
  price: number;

  @Prop({ required: true, min: 0, default: 0 })
  stockQty: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ProductDocument = HydratedDocument<Product>;
export const ProductSchema = SchemaFactory.createForClass(Product);
