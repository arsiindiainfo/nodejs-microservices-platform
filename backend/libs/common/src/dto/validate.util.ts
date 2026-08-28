import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationErrorException } from '../exceptions/domain.exceptions';

/**
 * TCP payloads arrive as plain deserialized JSON, not routed through Nest's
 * HTTP ValidationPipe — every MessagePattern handler validates its own `data`
 * with this one-liner so a malformed internal call fails the same way a bad
 * Gateway request would (§5's "every Gateway DTO uses class-validator" applied
 * consistently at the internal boundary too).
 */
export async function validateDto<T extends object>(
  cls: new () => T,
  plain: unknown,
): Promise<T> {
  const instance = plainToInstance(cls, plain ?? {});
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length > 0) {
    const message = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('; ');
    throw new ValidationErrorException(message || 'Payload failed validation.');
  }
  return instance;
}
