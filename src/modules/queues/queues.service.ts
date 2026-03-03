import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobsOptions, Queue } from 'bullmq';
import { Order } from '@/datasources/mongoose/Order.schema';
import { User } from '@/datasources/mongoose/User.schema';
import { Promo } from '@/datasources/mongoose/Promo.schema';
import { PromoUsage } from '@/datasources/mongoose/PromoUsage.schema';

const SYNC_JOB_OPTIONS: Omit<JobsOptions, 'jobId'> = {
  removeOnComplete: true,
  removeOnFail: { count: 100 },
};

@Injectable()
export class QueuesService {
  constructor(@InjectQueue('sync') readonly syncQueue: Queue) {}

  async syncOrder(data: Order): Promise<void> {
    await this.syncQueue.add('sync-order', data, {
      ...SYNC_JOB_OPTIONS,
      jobId: `order-${String(data._id)}`,
    });
  }

  async syncUser(data: User): Promise<void> {
    await this.syncQueue.add('sync-user', data, {
      ...SYNC_JOB_OPTIONS,
      jobId: `user-${String(data._id)}`,
    });
  }

  async syncPromo(data: Promo): Promise<void> {
    await this.syncQueue.add('sync-promo', data, {
      ...SYNC_JOB_OPTIONS,
      jobId: `promo-${String(data._id)}`,
    });
  }

  async syncPromoUsage(data: PromoUsage): Promise<void> {
    await this.syncQueue.add('sync-promousage', data, {
      ...SYNC_JOB_OPTIONS,
      jobId: `promousage-${String(data._id)}`,
    });
  }

  async bulkSyncOrders(data: Order[]): Promise<void> {
    await this.syncQueue.addBulk(
      data.map((d) => ({
        name: 'sync-order' as const,
        data: d,
        opts: { ...SYNC_JOB_OPTIONS, jobId: `order-${String(d._id)}` },
      })),
    );
  }

  async bulkSyncUsers(data: User[]): Promise<void> {
    await this.syncQueue.addBulk(
      data.map((d) => ({
        name: 'sync-user' as const,
        data: d,
        opts: { ...SYNC_JOB_OPTIONS, jobId: `user-${String(d._id)}` },
      })),
    );
  }

  async bulkSyncPromos(data: Promo[]): Promise<void> {
    await this.syncQueue.addBulk(
      data.map((d) => ({
        name: 'sync-promo' as const,
        data: d,
        opts: { ...SYNC_JOB_OPTIONS, jobId: `promo-${String(d._id)}` },
      })),
    );
  }

  async bulkSyncPromoUsages(data: PromoUsage[]): Promise<void> {
    await this.syncQueue.addBulk(
      data.map((d) => ({
        name: 'sync-promousage' as const,
        data: d,
        opts: { ...SYNC_JOB_OPTIONS, jobId: `promousage-${String(d._id)}` },
      })),
    );
  }
}
