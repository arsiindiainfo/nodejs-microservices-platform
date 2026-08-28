import { bootstrapMicroservice } from '@app/common';
import { AuthServiceModule } from './auth-service.module';

void bootstrapMicroservice('auth-service', AuthServiceModule);
