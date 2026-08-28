import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * §7.2's table DDL plus §10's stored procedures. TypeORM tracks this
 * migration in its own `migrations` table and runs it exactly once
 * (`migrationsRun: true`, §database.module.ts) — no manual DBA step is
 * needed before `docker compose up` can take a first order end to end (§28).
 *
 * Each array entry is its own batch: SQL Server requires `CREATE PROCEDURE`
 * to be the only statement in its batch, so table DDL and every procedure
 * are executed as separate `queryRunner.query()` calls rather than one
 * multi-statement script.
 */
export class InitialSchema1700000000001 implements MigrationInterface {
  name = 'InitialSchema1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of UP_STATEMENTS) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of DOWN_STATEMENTS) {
      await queryRunner.query(statement);
    }
  }
}

const UP_STATEMENTS: string[] = [
  `CREATE TABLE dbo.Orders (
    OrderId       BIGINT IDENTITY(1,1) PRIMARY KEY,
    CustomerId    UNIQUEIDENTIFIER NOT NULL,
    Status        VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    TotalAmount   DECIMAL(12,2) NOT NULL,
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    RowVersion    ROWVERSION
  )`,

  `CREATE INDEX IX_Orders_CustomerId ON dbo.Orders(CustomerId, Status)`,

  `CREATE TABLE dbo.OrderItems (
    OrderItemId          BIGINT IDENTITY(1,1) PRIMARY KEY,
    OrderId              BIGINT NOT NULL,
    ProductId            UNIQUEIDENTIFIER NOT NULL,
    ProductNameSnapshot  VARCHAR(200) NOT NULL,
    UnitPriceSnapshot    DECIMAL(12,2) NOT NULL,
    Quantity             INT NOT NULL,
    CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId),
    CONSTRAINT CK_OrderItems_Quantity CHECK (Quantity > 0)
  )`,

  `CREATE TABLE dbo.OutboxEvents (
    OutboxId      BIGINT IDENTITY(1,1) PRIMARY KEY,
    EventType     VARCHAR(60) NOT NULL,
    Payload       NVARCHAR(MAX) NOT NULL,
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PublishedAt   DATETIME2 NULL
  )`,

  `CREATE INDEX IX_Outbox_Unpublished ON dbo.OutboxEvents(CreatedAt) WHERE PublishedAt IS NULL`,

  `CREATE TABLE dbo.ProcessedEvents (
    EventId       UNIQUEIDENTIFIER PRIMARY KEY,
    EventType     VARCHAR(60) NOT NULL,
    ProcessedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  )`,

  // §10.1 — transactional create with outbox write, verbatim.
  `CREATE OR ALTER PROCEDURE dbo.usp_Order_Create
    @CustomerId UNIQUEIDENTIFIER,
    @ItemsJson  NVARCHAR(MAX),
    @OrderId    BIGINT OUTPUT,
    @StatusCode VARCHAR(30) OUTPUT,
    @Message    VARCHAR(255) OUTPUT
  AS
  BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
      BEGIN TRANSACTION;

      DECLARE @Total DECIMAL(12,2);
      SELECT @Total = SUM(CAST(UnitPrice AS DECIMAL(12,2)) * CAST(Qty AS INT))
        FROM OPENJSON(@ItemsJson) WITH (UnitPrice DECIMAL(12,2) '$.unitPrice', Qty INT '$.qty');

      INSERT INTO dbo.Orders (CustomerId, Status, TotalAmount)
        VALUES (@CustomerId, 'PENDING', @Total);
      SET @OrderId = SCOPE_IDENTITY();

      INSERT INTO dbo.OrderItems (OrderId, ProductId, ProductNameSnapshot, UnitPriceSnapshot, Quantity)
        SELECT @OrderId, ProductId, Name, UnitPrice, Qty
        FROM OPENJSON(@ItemsJson)
          WITH (ProductId UNIQUEIDENTIFIER '$.productId', Name VARCHAR(200) '$.name',
                UnitPrice DECIMAL(12,2) '$.unitPrice', Qty INT '$.qty');

      INSERT INTO dbo.OutboxEvents (EventType, Payload)
        VALUES ('ORDER_CREATED', (SELECT @OrderId AS orderId, @CustomerId AS customerId, @Total AS totalAmount,
                                    SYSUTCDATETIME() AS [timestamp] FOR JSON PATH, WITHOUT_ARRAY_WRAPPER));

      COMMIT TRANSACTION;
      SET @StatusCode = 'OK'; SET @Message = 'Order created.';
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
      SET @StatusCode = 'INTERNAL_ERROR'; SET @Message = ERROR_MESSAGE();
    END CATCH
  END`,

  // Flips the just-created order from PENDING to AWAITING_PAYMENT once the
  // outbox row has been written — a single checkout call (§19) never leaves
  // an order sitting in PENDING; that state exists for usp_Order_Cancel's
  // "still PENDING" guard (§11.1), not as a durable intermediate step here.
  `CREATE OR ALTER PROCEDURE dbo.usp_Order_ConfirmAwaitingPayment
    @OrderId BIGINT
  AS
  BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Orders SET Status = 'AWAITING_PAYMENT', UpdatedAt = SYSUTCDATETIME()
    WHERE OrderId = @OrderId AND Status = 'PENDING';
  END`,

  // §10.2 — idempotent, locked event consumption, verbatim.
  `CREATE OR ALTER PROCEDURE dbo.usp_Order_ApplyPaymentResult
    @EventId    UNIQUEIDENTIFIER, @OrderId BIGINT, @Outcome VARCHAR(10),
    @StatusCode VARCHAR(30) OUTPUT, @Message VARCHAR(255) OUTPUT
  AS
  BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
      BEGIN TRANSACTION;

      IF EXISTS (SELECT 1 FROM dbo.ProcessedEvents WITH (UPDLOCK, HOLDLOCK) WHERE EventId = @EventId) BEGIN
        COMMIT TRANSACTION;
        SET @StatusCode = 'ALREADY_PROCESSED'; SET @Message = 'Event already applied — no-op.';
        RETURN;
      END;

      UPDATE dbo.Orders WITH (UPDLOCK, ROWLOCK)
        SET Status = CASE WHEN @Outcome = 'SUCCEEDED' THEN 'PAID' ELSE 'PAYMENT_FAILED' END,
            UpdatedAt = SYSUTCDATETIME()
        WHERE OrderId = @OrderId AND Status = 'AWAITING_PAYMENT';

      IF @@ROWCOUNT = 0 BEGIN
        ROLLBACK TRANSACTION;
        SET @StatusCode = 'INVALID_TRANSITION'; SET @Message = 'Order was not awaiting payment.'; RETURN;
      END;

      INSERT INTO dbo.ProcessedEvents (EventId, EventType) VALUES (@EventId, 'PAYMENT_RESULT');
      COMMIT TRANSACTION;
      SET @StatusCode = 'OK'; SET @Message = 'Order status updated.';
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
      SET @StatusCode = 'INTERNAL_ERROR'; SET @Message = ERROR_MESSAGE();
    END CATCH
  END`,

  // Cancel is only valid while PENDING (§11.1, §19). @CustomerId = NULL means
  // "any customer" — the ADMIN path (Owner/ADMIN, §21) skips the ownership check.
  `CREATE OR ALTER PROCEDURE dbo.usp_Order_Cancel
    @OrderId BIGINT, @CustomerId UNIQUEIDENTIFIER = NULL,
    @StatusCode VARCHAR(30) OUTPUT, @Message VARCHAR(255) OUTPUT
  AS
  BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Orders SET Status = 'CANCELLED', UpdatedAt = SYSUTCDATETIME()
    WHERE OrderId = @OrderId
      AND (@CustomerId IS NULL OR CustomerId = @CustomerId)
      AND Status = 'PENDING';

    IF @@ROWCOUNT = 0 BEGIN
      SET @StatusCode = 'INVALID_TRANSITION'; SET @Message = 'Order cannot be cancelled from its current state.';
    END
    ELSE BEGIN
      SET @StatusCode = 'OK'; SET @Message = 'Order cancelled.';
    END
  END`,

  // One row, items collapsed into a JSON column — keeps this a single
  // result set so it round-trips cleanly through a plain parameterized query.
  `CREATE OR ALTER PROCEDURE dbo.usp_Order_GetById
    @OrderId BIGINT
  AS
  BEGIN
    SET NOCOUNT ON;
    SELECT
      o.OrderId, o.CustomerId, o.Status, o.TotalAmount, o.CreatedAt, o.UpdatedAt,
      (SELECT oi.ProductId, oi.ProductNameSnapshot, oi.UnitPriceSnapshot, oi.Quantity
       FROM dbo.OrderItems oi WHERE oi.OrderId = o.OrderId
       FOR JSON PATH) AS ItemsJson
    FROM dbo.Orders o
    WHERE o.OrderId = @OrderId;
  END`,

  // @CustomerId = NULL means "all customers" — backs both the customer's own
  // order list and the ADMIN unscoped list (§21) from one procedure. The
  // total is carried on every row via COUNT(*) OVER() so the whole call is
  // one result set — safer to round-trip through a plain parameterized
  // query than relying on multi-result-set support in the calling driver.
  `CREATE OR ALTER PROCEDURE dbo.usp_Order_ListByCustomer
    @CustomerId UNIQUEIDENTIFIER = NULL,
    @Status VARCHAR(30) = NULL,
    @Page INT = 1,
    @Limit INT = 20,
    @SortColumn VARCHAR(30) = 'CreatedAt',
    @SortDirection VARCHAR(4) = 'DESC'
  AS
  BEGIN
    SET NOCOUNT ON;
    DECLARE @Offset INT = (@Page - 1) * @Limit;

    SELECT OrderId, CustomerId, Status, TotalAmount, CreatedAt, UpdatedAt,
      COUNT(*) OVER() AS TotalCount
    FROM dbo.Orders
    WHERE (@CustomerId IS NULL OR CustomerId = @CustomerId)
      AND (@Status IS NULL OR Status = @Status)
    ORDER BY
      CASE WHEN @SortColumn = 'CreatedAt' AND @SortDirection = 'DESC' THEN CreatedAt END DESC,
      CASE WHEN @SortColumn = 'CreatedAt' AND @SortDirection = 'ASC' THEN CreatedAt END ASC,
      CASE WHEN @SortColumn = 'TotalAmount' AND @SortDirection = 'DESC' THEN TotalAmount END DESC,
      CASE WHEN @SortColumn = 'TotalAmount' AND @SortDirection = 'ASC' THEN TotalAmount END ASC,
      CreatedAt DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
  END`,

  // §10.4 — READPAST lets several publisher instances split the unpublished
  // backlog without blocking each other. Called from inside the
  // OutboxPublisher's own open transaction (order-outbox-publisher.service.ts)
  // so the UPDLOCK is held until the SNS publish + markPublished commit —
  // a crash anywhere in between leaves the rows simply unpublished (§12.1).
  `CREATE OR ALTER PROCEDURE dbo.usp_OutboxEvent_ClaimBatch
    @BatchSize INT
  AS
  BEGIN
    SET NOCOUNT ON;
    SELECT TOP (@BatchSize) OutboxId, EventType, Payload, CreatedAt
    FROM dbo.OutboxEvents WITH (UPDLOCK, READPAST)
    WHERE PublishedAt IS NULL
    ORDER BY CreatedAt;
  END`,

  // Backs product-service's DELETE guard (§18: "blocked if referenced by a
  // non-terminal order") — order-service is the only one who can answer
  // this, since product-service has no visibility into order status.
  `CREATE OR ALTER PROCEDURE dbo.usp_Order_ProductHasNonTerminalOrder
    @ProductId UNIQUEIDENTIFIER,
    @Result BIT OUTPUT
  AS
  BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
      SELECT 1 FROM dbo.OrderItems oi
      INNER JOIN dbo.Orders o ON o.OrderId = oi.OrderId
      WHERE oi.ProductId = @ProductId AND o.Status IN ('PENDING', 'AWAITING_PAYMENT', 'PAID')
    )
      SET @Result = 1;
    ELSE
      SET @Result = 0;
  END`,

  // notification-service needs to know who to notify for a payment result,
  // but the PAYMENT_SUCCEEDED/PAYMENT_FAILED payload (§11.2) carries only
  // orderId — this narrow, non-sensitive lookup lets it ask order-service
  // directly rather than payment-service denormalizing customerId onto an
  // event contract it doesn't otherwise need to know about.
  `CREATE OR ALTER PROCEDURE dbo.usp_Order_GetCustomerId
    @OrderId BIGINT,
    @CustomerId UNIQUEIDENTIFIER OUTPUT
  AS
  BEGIN
    SET NOCOUNT ON;
    SELECT @CustomerId = CustomerId FROM dbo.Orders WHERE OrderId = @OrderId;
  END`,

  `CREATE OR ALTER PROCEDURE dbo.usp_OutboxEvent_MarkPublished
    @OutboxId BIGINT
  AS
  BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OutboxEvents SET PublishedAt = SYSUTCDATETIME() WHERE OutboxId = @OutboxId;
  END`,
];

const DOWN_STATEMENTS: string[] = [
  'DROP PROCEDURE IF EXISTS dbo.usp_OutboxEvent_MarkPublished',
  'DROP PROCEDURE IF EXISTS dbo.usp_Order_GetCustomerId',
  'DROP PROCEDURE IF EXISTS dbo.usp_Order_ProductHasNonTerminalOrder',
  'DROP PROCEDURE IF EXISTS dbo.usp_OutboxEvent_ClaimBatch',
  'DROP PROCEDURE IF EXISTS dbo.usp_Order_ListByCustomer',
  'DROP PROCEDURE IF EXISTS dbo.usp_Order_GetById',
  'DROP PROCEDURE IF EXISTS dbo.usp_Order_Cancel',
  'DROP PROCEDURE IF EXISTS dbo.usp_Order_ApplyPaymentResult',
  'DROP PROCEDURE IF EXISTS dbo.usp_Order_ConfirmAwaitingPayment',
  'DROP PROCEDURE IF EXISTS dbo.usp_Order_Create',
  'DROP TABLE IF EXISTS dbo.ProcessedEvents',
  'DROP TABLE IF EXISTS dbo.OutboxEvents',
  'DROP TABLE IF EXISTS dbo.OrderItems',
  'DROP TABLE IF EXISTS dbo.Orders',
];
