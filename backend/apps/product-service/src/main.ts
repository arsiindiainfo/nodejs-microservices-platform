import { bootstrapMicroservice } from '@app/common';
import { ProductServiceModule } from './product-service.module';

void bootstrapMicroservice('product-service', ProductServiceModule);
