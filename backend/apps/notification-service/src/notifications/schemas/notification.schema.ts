import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export enum NotificationType {
  ORDER_PLACED = 'ORDER_PLACED',
  PAYMENT_SUCCEEDED = 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

/** §9 — `notifications` { _id, userId, type, message, read, createdAt }, indexed on { userId: 1, createdAt: -1 }. */
@Schema({
  collection: 'notifications',
  timestamps: { createdAt: 'createdAt', updatedAt: false },
})
export class Notification {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({ required: true, default: false })
  read: boolean;

  createdAt?: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, createdAt: -1 });
