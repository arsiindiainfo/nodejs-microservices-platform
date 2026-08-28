import { IsUUID } from 'class-validator';

export class NotificationIdDto {
  @IsUUID()
  notificationId: string;
}
