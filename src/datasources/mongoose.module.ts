import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Schema } from 'mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Order, OrderSchema } from '@/datasources/mongoose/Order.schema';
import { Promo, PromoSchema } from '@/datasources/mongoose/Promo.schema';
import {
  PromoUsage,
  PromoUsageSchema,
} from '@/datasources/mongoose/PromoUsage.schema';
import { User, UserSchema } from '@/datasources/mongoose/User.schema';
import { SyncPlugin } from './mongoose/sync.plugin';
import { QueuesService } from '@/modules/queues/queues.service';

const MODELS = [
  { name: Order.name, schema: OrderSchema, entityName: 'Order' },
  { name: Promo.name, schema: PromoSchema, entityName: 'Promo' },
  { name: PromoUsage.name, schema: PromoUsageSchema, entityName: 'PromoUsage' },
  { name: User.name, schema: UserSchema, entityName: 'User' },
];

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongodbUrl'),
      }),
    }),
    MongooseModule.forFeatureAsync(
      MODELS.map((model) => ({
        name: model.name,
        imports: [],
        inject: [QueuesService],
        useFactory: (queuesService: QueuesService) => {
          const schema = (model.schema as Schema).clone();
          schema.plugin(SyncPlugin, {
            queuesService,
            entityName: model.entityName,
          });
          return schema;
        },
      })),
    ),
  ],
  exports: [MongooseModule],
})
export class MongoDbModule {}
