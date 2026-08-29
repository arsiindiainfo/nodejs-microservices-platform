// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { bootstrapMicroservice } from '@app/common';
import { AuthServiceModule } from './auth-service.module';

void bootstrapMicroservice('auth-service', AuthServiceModule);
