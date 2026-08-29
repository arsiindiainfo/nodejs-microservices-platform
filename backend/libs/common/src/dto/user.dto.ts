// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { IsUUID } from 'class-validator';

export class UserIdDto {
  @IsUUID()
  userId: string;
}
