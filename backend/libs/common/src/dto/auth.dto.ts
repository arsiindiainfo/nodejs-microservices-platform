// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(10)
  password: string;

  /** Google reCAPTCHA response token from the client widget (§6.1 — bot mitigation on public auth endpoints). */
  @IsString()
  @MinLength(1)
  recaptchaToken: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  /** Google reCAPTCHA response token from the client widget (§6.1 — bot mitigation on public auth endpoints). */
  @IsString()
  @MinLength(1)
  recaptchaToken: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
