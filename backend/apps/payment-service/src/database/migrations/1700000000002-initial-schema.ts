// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * §8.2's table DDL plus §10.3/§10.4's stored procedures, run once via
 * TypeORM's own migration tracking (`migrationsRun: true`).
 *
 * Two corrections versus the plan's illustrative SQL, both needed to make
 * this actually executable MySQL rather than pseudocode:
 *  - `sp_payment_process`'s `LEAVE sp_payment_process` requires the routine's
 *    BEGIN...END block to carry that label explicitly.
 *  - The PAYMENT_FAILED outbox payload includes `reason` (§11.2's event
 *    catalog contract), not just `orderId`/`amount` — the plan's inline SQL
 *    sample used the same JSON_OBJECT call for both branches, which drops
 *    the field FAILED subscribers (notification-service) need.
 */
export class InitialSchema1700000000002 implements MigrationInterface {
  name = 'InitialSchema1700000000002';

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
  `CREATE TABLE payments (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id            BIGINT UNSIGNED NOT NULL,
    amount              DECIMAL(12,2) NOT NULL,
    status              ENUM('PENDING','SUCCEEDED','FAILED') NOT NULL DEFAULT 'PENDING',
    provider_reference  VARCHAR(100) NULL,
    failure_reason      VARCHAR(255) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_payment_order (order_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE outbox_events (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_type    VARCHAR(60) NOT NULL,
    payload       JSON NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at  DATETIME NULL,
    KEY idx_outbox_unpublished (published_at, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE processed_events (
    event_id      CHAR(36) PRIMARY KEY,
    event_type    VARCHAR(60) NOT NULL,
    processed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // §10.3 — idempotent create via unique constraint, branching outcome.
  `CREATE PROCEDURE sp_payment_process(
    IN  p_event_id CHAR(36), IN p_order_id BIGINT UNSIGNED, IN p_amount DECIMAL(12,2),
    OUT p_status VARCHAR(10), OUT p_status_code VARCHAR(30), OUT p_message VARCHAR(255)
  )
  sp_payment_process: BEGIN
    DECLARE v_existing VARCHAR(10) DEFAULT NULL;
    DECLARE v_failure_reason VARCHAR(255) DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
      ROLLBACK;
      SET p_status_code = 'INTERNAL_ERROR', p_message = 'Unexpected database error while processing payment.';
    END;

    START TRANSACTION;

    IF EXISTS (SELECT 1 FROM processed_events WHERE event_id = p_event_id FOR UPDATE) THEN
      SELECT status INTO v_existing FROM payments WHERE order_id = p_order_id;
      COMMIT;
      SET p_status = v_existing, p_status_code = 'ALREADY_PROCESSED', p_message = 'Payment already processed — no-op.';
      LEAVE sp_payment_process;
    END IF;

    SET p_status = IF(p_amount <= 5000, 'SUCCEEDED', 'FAILED');
    IF p_status = 'FAILED' THEN
      SET v_failure_reason = 'Simulated decline: amount exceeds demo limit.';
    END IF;

    INSERT INTO payments (order_id, amount, status, provider_reference, failure_reason)
      VALUES (p_order_id, p_amount, p_status,
        IF(p_status = 'SUCCEEDED', CONCAT('SIM-', UUID()), NULL),
        v_failure_reason)
    ON DUPLICATE KEY UPDATE status = status;

    INSERT INTO outbox_events (event_type, payload)
      VALUES (
        IF(p_status = 'SUCCEEDED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED'),
        IF(p_status = 'SUCCEEDED',
          JSON_OBJECT('orderId', p_order_id, 'amount', p_amount, 'timestamp', NOW()),
          JSON_OBJECT('orderId', p_order_id, 'reason', v_failure_reason, 'timestamp', NOW()))
      );

    INSERT INTO processed_events (event_id, event_type) VALUES (p_event_id, 'ORDER_CREATED');

    COMMIT;
    SET p_status_code = 'OK', p_message = 'Payment processed.';
  END`,

  // Read backing §20's GET /orders/:id/payment.
  `CREATE PROCEDURE sp_payment_get_by_order(IN p_order_id BIGINT UNSIGNED)
  BEGIN
    SELECT id, order_id, amount, status, provider_reference, failure_reason, created_at, updated_at
    FROM payments WHERE order_id = p_order_id;
  END`,

  // §10.4 — MySQL 8's FOR UPDATE SKIP LOCKED equivalent of order-service's
  // READPAST claim query, called from inside the OutboxPublisher's own
  // transaction (order-outbox-publisher.service.ts's payment-service twin)
  // so the lock is held until the SNS publish + mark-published commit.
  `CREATE PROCEDURE sp_outbox_claim_batch(IN p_batch_size INT)
  BEGIN
    SELECT id, event_type, payload, created_at
    FROM outbox_events
    WHERE published_at IS NULL
    ORDER BY created_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED;
  END`,

  `CREATE PROCEDURE sp_outbox_mark_published(IN p_id BIGINT UNSIGNED)
  BEGIN
    UPDATE outbox_events SET published_at = NOW() WHERE id = p_id;
  END`,

  // Small reusable insert available to any future MySQL-side consumer (§10.4).
  `CREATE PROCEDURE sp_processed_event_record(IN p_event_id CHAR(36), IN p_event_type VARCHAR(60))
  BEGIN
    INSERT INTO processed_events (event_id, event_type) VALUES (p_event_id, p_event_type)
    ON DUPLICATE KEY UPDATE event_id = event_id;
  END`,
];

const DOWN_STATEMENTS: string[] = [
  'DROP PROCEDURE IF EXISTS sp_processed_event_record',
  'DROP PROCEDURE IF EXISTS sp_outbox_mark_published',
  'DROP PROCEDURE IF EXISTS sp_outbox_claim_batch',
  'DROP PROCEDURE IF EXISTS sp_payment_get_by_order',
  'DROP PROCEDURE IF EXISTS sp_payment_process',
  'DROP TABLE IF EXISTS processed_events',
  'DROP TABLE IF EXISTS outbox_events',
  'DROP TABLE IF EXISTS payments',
];
