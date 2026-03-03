import { DatabaseModule } from '@/datasources/database.module';
import { QueuesModule } from '@/modules/queues/queues.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import envConfig from '@/common/config/env.config';
import envSchema from '@/common/config/env.schema';
import { APP_PIPE, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { OrderModule } from './modules/order/order.module';
import { PromoModule } from './modules/promo/promo.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    DatabaseModule,
    QueuesModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      validate: (config) => {
        try {
          return envSchema.parse(config);
        } catch (e) {
          throw new Error('Invalid environment variables', { cause: e });
        }
      },
    }),
    AuthModule,
    OrderModule,
    PromoModule,
    AnalyticsModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class MainModule {}
