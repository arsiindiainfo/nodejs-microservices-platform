// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { bootstrapMicroservice } from '@app/common';
import { NotificationServiceModule } from './notification-service.module';

void bootstrapMicroservice('notification-service', NotificationServiceModule);
