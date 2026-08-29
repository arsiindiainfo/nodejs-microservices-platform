// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '../constants/order-status.enum';
import { PaginationQueryDto } from './pagination-query.dto';

export class OrderItemInputDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];
}

export class OrderIdDto {
  @Type(() => Number)
  @IsInt()
  orderId: number;
}

export class OrderListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(Object.values(OrderStatus))
  status?: OrderStatus;
}
