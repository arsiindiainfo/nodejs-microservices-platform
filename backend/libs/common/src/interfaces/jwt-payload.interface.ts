// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Role } from '../constants/role.enum';

export interface JwtPayload {
  sub: string; // user id (user-service Mongo _id)
  email: string;
  role: Role;
}

export type AuthenticatedUser = JwtPayload;
