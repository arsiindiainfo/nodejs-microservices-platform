// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { bootstrapMicroservice } from '@app/common';
import { OrderServiceModule } from './order-service.module';

void bootstrapMicroservice('order-service', OrderServiceModule);
