// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Role } from '../constants/role.enum';

/** What user-service returns over TCP — never includes passwordHash (§6.2). */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
}
