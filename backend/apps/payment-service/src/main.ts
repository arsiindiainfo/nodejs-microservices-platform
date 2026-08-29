// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { bootstrapMicroservice } from '@app/common';
import { PaymentServiceModule } from './payment-service.module';

void bootstrapMicroservice('payment-service', PaymentServiceModule);
