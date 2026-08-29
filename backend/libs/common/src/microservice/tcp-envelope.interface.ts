// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
/**
 * Every synchronous TCP call between services carries the caller's JWT and
 * correlation id as explicit metadata — TCP has no HTTP-style headers, and
 * §6.3 requires every hop to independently re-verify the JWT rather than
 * trust the network boundary.
 */
export interface TcpMeta {
  correlationId: string;
  /** Bearer token forwarded from the inbound HTTP request; absent for unauthenticated calls. */
  jwt?: string;
}

export interface TcpEnvelope<T> {
  meta: TcpMeta;
  data: T;
}

export function buildTcpEnvelope<T>(data: T, meta: TcpMeta): TcpEnvelope<T> {
  return { meta, data };
}
