// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface ProcessPaymentResult {
  status: 'SUCCEEDED' | 'FAILED' | null;
  statusCode: string;
  message: string;
}

export interface RawPaymentRow {
  id: number;
  order_id: number;
  amount: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  provider_reference: string | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * The only layer touching MySQL (§5) — every call goes through a §10.3/§10.4
 * stored procedure. OUT parameters ride on MySQL session variables, so the
 * CALL and the SELECT that reads them back must run on the exact same
 * connection — hence `createQueryRunner()` (which pins one) rather than the
 * pooled `DataSource.query()` used for plain reads.
 */
@Injectable()
export class PaymentsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async processPayment(
    eventId: string,
    orderId: number,
    amount: number,
  ): Promise<ProcessPaymentResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.query(
        'CALL sp_payment_process(?, ?, ?, @p_status, @p_status_code, @p_message)',
        [eventId, orderId, amount],
      );
      const rows = (await queryRunner.query(
        'SELECT @p_status AS status, @p_status_code AS statusCode, @p_message AS message',
      )) as ProcessPaymentResult[];
      return rows[0];
    } finally {
      await queryRunner.release();
    }
  }

  async findByOrderId(orderId: number): Promise<RawPaymentRow | undefined> {
    // mysql2 returns [rows, outputParams] for a CALL with no session-var outputs; the proc's own SELECT is rows[0].
    const rows = await this.dataSource.query<[RawPaymentRow[], unknown]>(
      'CALL sp_payment_get_by_order(?)',
      [orderId],
    );
    return rows[0][0];
  }
}
