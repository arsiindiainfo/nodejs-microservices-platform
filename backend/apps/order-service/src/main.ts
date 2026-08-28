import { bootstrapMicroservice } from '@app/common';
import { OrderServiceModule } from './order-service.module';

void bootstrapMicroservice('order-service', OrderServiceModule);
