import { bootstrapMicroservice } from '@app/common';
import { NotificationServiceModule } from './notification-service.module';

void bootstrapMicroservice('notification-service', NotificationServiceModule);
