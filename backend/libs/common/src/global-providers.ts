import { Provider } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtVerificationGuard, RolesGuard } from './guards';
import { LoggingInterceptor, PoweredByInterceptor } from './interceptors';

/**
 * Every service wires these into its root module's `providers` array
 * (`...GLOBAL_HTTP_PROVIDERS`) so JWT re-verification (§6.3), role checks,
 * branding header (§32.2), and structured request logging (§13.1) apply
 * uniformly without being repeated by hand in each service.
 *
 * Registered as APP_GUARD/APP_INTERCEPTOR rather than via `app.useGlobalGuards()`
 * in main.ts because these need DI-resolved dependencies (JwtService, Reflector,
 * Redis client) that are only reachable from inside the module graph.
 */
export const GLOBAL_HTTP_PROVIDERS: Provider[] = [
  { provide: APP_GUARD, useClass: JwtVerificationGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
  { provide: APP_INTERCEPTOR, useClass: PoweredByInterceptor },
  { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
];
