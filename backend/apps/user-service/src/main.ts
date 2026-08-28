import { bootstrapMicroservice } from '@app/common';
import { UserServiceModule } from './user-service.module';

void bootstrapMicroservice('user-service', UserServiceModule);
