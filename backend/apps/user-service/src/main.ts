// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { bootstrapMicroservice } from '@app/common';
import { UserServiceModule } from './user-service.module';

void bootstrapMicroservice('user-service', UserServiceModule);
