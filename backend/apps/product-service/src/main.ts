// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { bootstrapMicroservice } from '@app/common';
import { ProductServiceModule } from './product-service.module';

void bootstrapMicroservice('product-service', ProductServiceModule);
