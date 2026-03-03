import { IClickHouseOrder } from '@/datasources/clickHouse/Order.interface';
import { IClickHousePromo } from '@/datasources/clickHouse/Promo.interface';
import { IClickHousePromoUsage } from '@/datasources/clickHouse/PromoUsage.interface';
import { IClickHouseUser } from '@/datasources/clickHouse/User.interface';
import { Order } from '@/datasources/mongoose/Order.schema';
import { Promo } from '@/datasources/mongoose/Promo.schema';
import { PromoUsage } from '@/datasources/mongoose/PromoUsage.schema';
import { User } from '@/datasources/mongoose/User.schema';
import { QueuesService } from '@/modules/queues/queues.service';

export interface SyncPluginOptions {
  queuesService: QueuesService;
  entityName: string;
}

export type SyncMethodName =
  | 'syncOrder'
  | 'syncUser'
  | 'syncPromo'
  | 'syncPromoUsage';

export type SyncData = Order | User | Promo | PromoUsage;

export interface SyncMethods {
  syncOrder(data: Order): Promise<void>;
  syncUser(data: User): Promise<void>;
  syncPromo(data: Promo): Promise<void>;
  syncPromoUsage(data: PromoUsage): Promise<void>;
}

export type ClickHouseData =
  | IClickHouseOrder
  | IClickHouseUser
  | IClickHousePromo
  | IClickHousePromoUsage;
