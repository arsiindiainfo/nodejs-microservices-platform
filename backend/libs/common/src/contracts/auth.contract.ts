// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { UserProfile } from './user-profile.contract';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession extends TokenPair {
  user: UserProfile;
}
