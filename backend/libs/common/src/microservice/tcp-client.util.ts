import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ErrorCode } from '../constants/error-code.enum';
import { ApiException } from '../exceptions/api.exception';
import { ServiceUnavailableException } from '../exceptions/domain.exceptions';
import { ApiErrorBody } from '../interfaces/api-response.interface';
import { TcpEnvelope, TcpMeta } from './tcp-envelope.interface';

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Standard way every service calls another over TCP (§6.3, §19). A timeout
 * or connection failure surfaces as 503 SERVICE_UNAVAILABLE naming the
 * downstream service (§5) rather than a bare 500; a thrown ApiException on
 * the other end is reconstructed here so the same errorCode/message survive
 * the hop.
 */
export async function callTcpService<T>(
  client: ClientProxy,
  pattern: string,
  data: unknown,
  meta: TcpMeta,
  serviceName: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const envelope: TcpEnvelope<unknown> = { meta, data };
  try {
    return await firstValueFrom(
      client.send<T>(pattern, envelope).pipe(timeout(timeoutMs)),
    );
  } catch (error) {
    if (error instanceof TimeoutError) {
      throw new ServiceUnavailableException(serviceName);
    }
    throw toApiException(error, serviceName);
  }
}

export function toApiException(
  error: unknown,
  fallbackService: string,
): ApiException {
  if (error instanceof ApiException) {
    return error;
  }
  const body = error as Partial<ApiErrorBody> | undefined;
  if (body && typeof body === 'object' && 'code' in body) {
    return new ApiException(
      (body.code as ErrorCode) ?? ErrorCode.SERVICE_UNAVAILABLE,
      body.message ?? `${fallbackService} did not respond correctly.`,
      body.service ?? fallbackService,
    );
  }
  return new ServiceUnavailableException(fallbackService);
}
