import { EventType } from './event-type.enum';

/**
 * What actually rides on the outbox row and the SNS/SQS wire — the §11.2
 * table lists each event's business payload, but every event travels wrapped
 * in this envelope so a consumer can idempotency-check on `eventId` (§12.2)
 * and trace it end to end via `correlationId` (§13.1) without either concern
 * leaking into the business payload types themselves.
 */
export interface EventEnvelope<T> {
  eventId: string;
  eventType: EventType;
  eventVersion: 1;
  correlationId: string;
  occurredAt: string;
  payload: T;
}

export function wrapEvent<T>(
  eventId: string,
  eventType: EventType,
  correlationId: string,
  payload: T,
  occurredAt: string = new Date().toISOString(),
): EventEnvelope<T> {
  return {
    eventId,
    eventType,
    eventVersion: 1,
    correlationId,
    occurredAt,
    payload,
  };
}
