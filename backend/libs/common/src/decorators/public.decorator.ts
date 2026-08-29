// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route/message-pattern as exempt from JwtVerificationGuard — §14's login/register/refresh. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
