import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface CreateOrderItemInput {
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
}

export interface StoredProcResult {
  statusCode: string;
  message: string;
}

export interface RawOrderRow {
  OrderId: number;
  CustomerId: string;
  Status: string;
  TotalAmount: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface RawOrderDetailRow extends RawOrderRow {
  ItemsJson: string | null;
}

export interface RawOrderListRow extends RawOrderRow {
  TotalCount: number;
}

export interface ListOrdersParams {
  customerId: string | null;
  status: string | null;
  page: number;
  limit: number;
  sortColumn: string;
  sortDirection: string;
}

/**
 * The only layer touching SQL Server (§5) — every call goes through a §10
 * stored procedure. OUTPUT parameters are captured by declaring local
 * variables in the same batch and selecting them back, so a plain
 * parameterized `DataSource.query()` is enough; no driver-specific output-
 * parameter API is needed.
 */
@Injectable()
export class OrdersRepository {
  constructor(private readonly dataSource: DataSource) {}

  async createOrder(
    customerId: string,
    items: CreateOrderItemInput[],
  ): Promise<StoredProcResult & { orderId: number }> {
    const rows = await this.dataSource.query(
      `DECLARE @OrderId BIGINT, @StatusCode VARCHAR(30), @Message VARCHAR(255);
       EXEC dbo.usp_Order_Create @CustomerId = @0, @ItemsJson = @1,
         @OrderId = @OrderId OUTPUT, @StatusCode = @StatusCode OUTPUT, @Message = @Message OUTPUT;
       SELECT @OrderId AS OrderId, @StatusCode AS StatusCode, @Message AS Message;`,
      [customerId, JSON.stringify(items)],
    );
    const row = rows[0];
    return {
      orderId: row.OrderId,
      statusCode: row.StatusCode,
      message: row.Message,
    };
  }

  async confirmAwaitingPayment(orderId: number): Promise<void> {
    await this.dataSource.query(
      'EXEC dbo.usp_Order_ConfirmAwaitingPayment @OrderId = @0',
      [orderId],
    );
  }

  async applyPaymentResult(
    eventId: string,
    orderId: number,
    outcome: 'SUCCEEDED' | 'FAILED',
  ): Promise<StoredProcResult> {
    const rows = await this.dataSource.query(
      `DECLARE @StatusCode VARCHAR(30), @Message VARCHAR(255);
       EXEC dbo.usp_Order_ApplyPaymentResult @EventId = @0, @OrderId = @1, @Outcome = @2,
         @StatusCode = @StatusCode OUTPUT, @Message = @Message OUTPUT;
       SELECT @StatusCode AS StatusCode, @Message AS Message;`,
      [eventId, orderId, outcome],
    );
    return { statusCode: rows[0].StatusCode, message: rows[0].Message };
  }

  async cancel(
    orderId: number,
    customerId: string | null,
  ): Promise<StoredProcResult> {
    const rows = await this.dataSource.query(
      `DECLARE @StatusCode VARCHAR(30), @Message VARCHAR(255);
       EXEC dbo.usp_Order_Cancel @OrderId = @0, @CustomerId = @1,
         @StatusCode = @StatusCode OUTPUT, @Message = @Message OUTPUT;
       SELECT @StatusCode AS StatusCode, @Message AS Message;`,
      [orderId, customerId],
    );
    return { statusCode: rows[0].StatusCode, message: rows[0].Message };
  }

  async getById(orderId: number): Promise<RawOrderDetailRow | undefined> {
    const rows = await this.dataSource.query(
      'EXEC dbo.usp_Order_GetById @OrderId = @0',
      [orderId],
    );
    return rows[0];
  }

  async getCustomerId(orderId: number): Promise<string | undefined> {
    const rows = await this.dataSource.query(
      `DECLARE @CustomerId UNIQUEIDENTIFIER;
       EXEC dbo.usp_Order_GetCustomerId @OrderId = @0, @CustomerId = @CustomerId OUTPUT;
       SELECT @CustomerId AS CustomerId;`,
      [orderId],
    );
    return rows[0]?.CustomerId ?? undefined;
  }

  async productHasNonTerminalOrder(productId: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `DECLARE @Result BIT;
       EXEC dbo.usp_Order_ProductHasNonTerminalOrder @ProductId = @0, @Result = @Result OUTPUT;
       SELECT @Result AS Result;`,
      [productId],
    );
    return Boolean(rows[0]?.Result);
  }

  async list(
    params: ListOrdersParams,
  ): Promise<{ rows: RawOrderListRow[]; total: number }> {
    const rows: RawOrderListRow[] = await this.dataSource.query(
      `EXEC dbo.usp_Order_ListByCustomer @CustomerId = @0, @Status = @1, @Page = @2, @Limit = @3,
        @SortColumn = @4, @SortDirection = @5`,
      [
        params.customerId,
        params.status,
        params.page,
        params.limit,
        params.sortColumn,
        params.sortDirection,
      ],
    );
    return { rows, total: rows[0]?.TotalCount ?? 0 };
  }
}
