import {
  Injectable,
  OnApplicationBootstrap,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '@/datasources/mongoose/User.schema';
import { Order } from '@/datasources/mongoose/Order.schema';
import { Promo } from '@/datasources/mongoose/Promo.schema';
import { PromoUsage } from '@/datasources/mongoose/PromoUsage.schema';
import { QueuesService } from './queues.service';
import { CLICKHOUSE_CLIENT } from '@/datasources/clickhouse.module';
import { ClickHouseClient } from '@clickhouse/client';

const BATCH_SIZE = 500;

@Injectable()
export class SyncBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SyncBootstrapService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Promo.name) private readonly promoModel: Model<Promo>,
    @InjectModel(PromoUsage.name)
    private readonly promoUsageModel: Model<PromoUsage>,
    private readonly queuesService: QueuesService,
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouseClient: ClickHouseClient,
  ) {}

  async onApplicationBootstrap() {
    const alreadySynced = await this.isAlreadySynced();

    if (alreadySynced) {
      this.logger.log(
        'Bootstrap sync skipped — ClickHouse counts match MongoDB. ' +
          'To force re-sync, clear ClickHouse tables.',
      );
      return;
    }

    this.logger.log('Starting full database synchronization...');
    const startedAt = Date.now();

    try {
      const results = await Promise.allSettled([
        this.syncCollection('User', this.userModel, (d) =>
          this.queuesService.bulkSyncUsers(d),
        ),
        this.syncCollection('Promo', this.promoModel, (d) =>
          this.queuesService.bulkSyncPromos(d),
        ),
        this.syncCollection('Order', this.orderModel, (d) =>
          this.queuesService.bulkSyncOrders(d),
        ),
        this.syncCollection('PromoUsage', this.promoUsageModel, (d) =>
          this.queuesService.bulkSyncPromoUsages(d),
        ),
      ]);

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        for (const f of failed) {
          if (f.status === 'rejected') {
            this.logger.error('Collection sync failed:', f.reason);
          }
        }
        this.logger.warn(
          `Bootstrap sync completed with ${failed.length} collection error(s).`,
        );
      }

      const elapsedMs = Date.now() - startedAt;
      this.logger.log(
        `Full database synchronization completed in ${elapsedMs}ms.`,
      );
    } catch (error) {
      this.logger.error('Unexpected error during full synchronization:', error);
    }
  }

  private async isAlreadySynced(): Promise<boolean> {
    try {
      const [mongoUsers, mongoOrders, mongoPromos, mongoUsages] =
        await Promise.all([
          this.userModel.countDocuments(),
          this.orderModel.countDocuments(),
          this.promoModel.countDocuments(),
          this.promoUsageModel.countDocuments(),
        ]);

      // Если MongoDB пуст — нечего синхронизировать, пропускаем
      if (
        mongoUsers === 0 &&
        mongoOrders === 0 &&
        mongoPromos === 0 &&
        mongoUsages === 0
      ) {
        this.logger.log('MongoDB is empty, bootstrap sync skipped.');
        return true;
      }

      const [chUsers, chOrders, chPromos, chUsages] = await Promise.all([
        this.getClickHouseCount('User'),
        this.getClickHouseCount('Order'),
        this.getClickHouseCount('Promo'),
        this.getClickHouseCount('PromoUsage'),
      ]);

      this.logger.log(
        `MongoDB counts — User: ${mongoUsers}, Order: ${mongoOrders}, ` +
          `Promo: ${mongoPromos}, PromoUsage: ${mongoUsages}`,
      );
      this.logger.log(
        `ClickHouse counts — User: ${chUsers}, Order: ${chOrders}, ` +
          `Promo: ${chPromos}, PromoUsage: ${chUsages}`,
      );

      return (
        mongoUsers === chUsers &&
        mongoOrders === chOrders &&
        mongoPromos === chPromos &&
        mongoUsages === chUsages
      );
    } catch (err) {
      this.logger.warn(
        'Could not verify ClickHouse counts, proceeding with sync:',
        (err as Error).message,
      );
      return false;
    }
  }

  private async getClickHouseCount(table: string): Promise<number> {
    const resultSet = await this.clickhouseClient.query({
      query: `SELECT count() as cnt FROM ${table} FINAL`,
      format: 'JSONEachRow',
    });
    const rows = await resultSet.json<unknown[]>();
    const first = rows[0] as { cnt?: string } | undefined;
    return Number(first?.cnt ?? 0);
  }

  private async syncCollection<T extends { _id: unknown }>(
    name: string,
    model: Model<T>,
    bulkFn: (batch: T[]) => Promise<unknown>,
  ): Promise<void> {
    const count = await model.countDocuments();
    this.logger.log(`Starting sync of ${count} documents from ${name}...`);

    const cursor = model.find().lean().cursor();
    let batch: T[] = [];
    let totalQueued = 0;

    for await (const doc of cursor) {
      batch.push(doc as T);

      if (batch.length >= BATCH_SIZE) {
        await bulkFn(batch);
        totalQueued += batch.length;
        this.logger.log(`Queued ${totalQueued}/${count} from ${name}`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await bulkFn(batch);
      totalQueued += batch.length;
    }

    this.logger.log(
      `Finished queuing ${totalQueued} documents from ${name} into sync queue`,
    );
  }
}
