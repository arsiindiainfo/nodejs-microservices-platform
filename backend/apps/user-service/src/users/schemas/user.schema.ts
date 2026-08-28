import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';
import { Role } from '@app/common';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

/**
 * §9 — `users` { _id, name, email (unique index), passwordHash, role, status, createdAt }
 *
 * `_id` is a UUID string rather than Mongo's default ObjectId — §7.3 calls
 * order-service's CustomerId a "UUID" reference into this collection, and
 * §7.2 types that column as SQL Server's UNIQUEIDENTIFIER, which an ObjectId
 * doesn't fit. Every cross-service reference in this platform is a real UUID.
 */
@Schema({
  collection: 'users',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class User {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, enum: Role, default: Role.CUSTOMER })
  role: Role;

  @Prop({ required: true, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
