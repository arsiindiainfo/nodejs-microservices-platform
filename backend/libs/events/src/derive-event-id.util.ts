// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { v5 as uuidv5 } from 'uuid';

/**
 * A fixed, arbitrary namespace UUID (RFC 4122 §4.3) — any constant works as
 * long as it's stable across deploys, since v5 only needs it to be the same
 * value every time to produce the same output for the same name.
 */
const OUTBOX_EVENT_NAMESPACE = '6f1b1b2e-8f2d-4b7a-9b3d-6a2f1e9c7d10';

/**
 * The outbox row's own Payload column stores only the business fields
 * (§10.1's INSERT), not an eventId — so the OutboxPublisher derives one
 * deterministically from `(service, outboxId)` at publish time. Deriving it
 * (rather than generating a random one per publish attempt) means a row
 * that gets re-claimed and re-published after a crash produces the exact
 * same eventId, so the consumer's idempotency check (§12.2) still catches it.
 */
export function deriveEventId(
  service: string,
  outboxId: number | string,
): string {
  return uuidv5(`${service}:${outboxId}`, OUTBOX_EVENT_NAMESPACE);
}
