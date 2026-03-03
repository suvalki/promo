import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AuthModule } from '@/modules/auth/auth.module';
import { PromoModule } from '@/modules/promo/promo.module';

@Module({
  imports: [AuthModule, PromoModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
