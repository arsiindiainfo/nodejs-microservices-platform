import { bootstrapMicroservice } from '@app/common';
import { PaymentServiceModule } from './payment-service.module';

void bootstrapMicroservice('payment-service', PaymentServiceModule);
