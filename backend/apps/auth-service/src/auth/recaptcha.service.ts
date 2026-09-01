// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecaptchaVerificationException } from '@app/common';

interface SiteVerifyResponse {
  success: boolean;
  score?: number;
  'error-codes'?: string[];
}

/**
 * Verifies Google reCAPTCHA v2 tokens on register/login — DemoTech Commerce
 * is a public, unauthenticated-by-nature demo (anyone can hit /auth/register
 * or /auth/login), which otherwise makes those two endpoints an easy target
 * for scripted account-creation/credential-stuffing abuse.
 */
@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly secretKey: string;
  private readonly verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

  constructor(config: ConfigService) {
    this.secretKey = config.getOrThrow<string>('RECAPTCHA_SECRET_KEY');
  }

  async verify(token: string): Promise<void> {
    let body: SiteVerifyResponse;
    try {
      const response = await fetch(this.verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: this.secretKey, response: token }),
        signal: AbortSignal.timeout(8000),
      });
      body = (await response.json()) as SiteVerifyResponse;
    } catch (error) {
      this.logger.error(
        `reCAPTCHA verification request failed: ${(error as Error).message}`,
      );
      throw new RecaptchaVerificationException(
        'Could not verify reCAPTCHA right now. Please try again.',
      );
    }

    if (!body.success) {
      this.logger.warn(
        `reCAPTCHA verification rejected: ${(body['error-codes'] ?? []).join(', ')}`,
      );
      throw new RecaptchaVerificationException();
    }
  }
}
