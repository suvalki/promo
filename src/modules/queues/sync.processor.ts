import { ClickHouseData, SyncData } from '@/common/types/mongoose-plugin.types';
import { CLICKHOUSE_CLIENT } from '@/datasources/clickhouse.module';
import { IClickHouseOrder } from '@/datasources/clickHouse/Order.interface';
import { IClickHousePromo } from '@/datasources/clickHouse/Promo.interface';
import { IClickHousePromoUsage } from '@/datasources/clickHouse/PromoUsage.interface';
import { IClickHouseUser } from '@/datasources/clickHouse/User.interface';
import { Order } from '@/datasources/mongoose/Order.schema';
import { Promo } from '@/datasources/mongoose/Promo.schema';
import { PromoUsage } from '@/datasources/mongoose/PromoUsage.schema';
import { User } from '@/datasources/mongoose/User.schema';
import { ClickHouseClient } from '@clickhouse/client';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model, Types } from 'mongoose';

type AllowedTable = 'User' | 'Order' | 'Promo' | 'PromoUsage';

@Processor('sync')
@Injectable()
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouseClient: ClickHouseClient,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Promo.name) private promoModel: Model<Promo>,
    @InjectModel(PromoUsage.name) private promoUsageModel: Model<PromoUsage>,
  ) {
    super();
  }

  async process(job: Job<SyncData, unknown, string>): Promise<void> {
    const { name, data } = job;
    const documentId = data._id.toString();

    if (!documentId) {
      this.logger.error(`Job ${job.id} does not have a valid _id in data`);
      return;
    }

    this.logger.log(
      `Processing job ${job.id} of type ${name} for document ${documentId}`,
    );

    try {
      switch (name) {
        case 'sync-user':
          await this.handleUser(documentId);
          break;
        case 'sync-order':
          await this.handleOrder(documentId);
          break;
        case 'sync-promo':
          await this.handlePromo(documentId);
          break;
        case 'sync-promousage':
          await this.handlePromoUsage(documentId);
          break;
        default:
          this.logger.warn(`Unknown job name: ${name}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error processing job ${job.id}: ${error.message}`,
          error.stack,
        );
      }
      throw error;
    }
  }

  private async handleUser(id: string): Promise<void> {
    const user = await this.userModel.findById(id).lean();
    if (!user) {
      await this.deleteFromClickhouse('User', id);
      return;
    }

    const clickHouseData: IClickHouseUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      bannedAt: this.formatDate(user.bannedAt),
      createdAt: this.formatDate(user.createdAt),
      updatedAt: this.formatDate(user.updatedAt),
    };

    await this.replaceInClickhouse('User', clickHouseData);
  }

  public async handlePromo(id: string): Promise<void> {
    const promo = await this.promoModel.findById(id).lean();
    if (!promo) {
      await this.deleteFromClickhouse('Promo', id);
      return;
    }

    const clickHouseData: IClickHousePromo = {
      id: promo._id.toString(),
      code: promo.code,
      discount: promo.discount,
      activeFrom: this.formatDate(promo.activeFrom),
      expiredAt: this.formatDate(promo.expiredAt),
      globalLimit: promo.globalLimit,
      userLimit: promo.userLimit,
      inactiveAt: this.formatDate(promo.inactiveAt),
      createdBy: (promo.createdBy as Types.ObjectId).toHexString(),
      createdAt: this.formatDate(promo.createdAt),
      updatedAt: this.formatDate(promo.updatedAt),
    };

    await this.replaceInClickhouse('Promo', clickHouseData);
  }

  public async handleOrder(id: string): Promise<void> {
    const order = await this.orderModel
      .findById(id)
      .populate<{ user: User & { _id: Types.ObjectId } }>('user')
      .lean();

    if (!order) {
      await this.deleteFromClickhouse('Order', id);
      return;
    }

    const user = order.user;
    if (!user) {
      this.logger.warn(`User not found for order ${id}, skipping sync`);
      return;
    }

    const promoUsage = await this.promoUsageModel
      .findOne({ 'order._id': order._id })
      .lean();

    const clickHouseData: IClickHouseOrder = {
      id: order._id.toString(),
      userId: user._id.toString(),
      userName: user.name || '',
      userEmail: user.email || '',
      userPhone: user.phone || '',
      organicCost: order.organicCost,
      totalCost: promoUsage ? promoUsage.cost : order.organicCost,
      promoId: promoUsage
        ? (promoUsage.promo as Promo & { _id: Types.ObjectId })._id.toString()
        : null,
      promoCode: promoUsage ? promoUsage.promo.code : null,
      promoDiscount: promoUsage ? promoUsage.promo.discount : null,
      inactiveAt: this.formatDate(order.inactiveAt),
      createdAt: this.formatDate(order.createdAt),
      updatedAt: this.formatDate(order.updatedAt),
    };

    await this.replaceInClickhouse('Order', clickHouseData);
  }

  public async handlePromoUsage(id: string): Promise<void> {
    const usage = await this.promoUsageModel.findById(id).lean();

    if (!usage) {
      await this.deleteFromClickhouse('PromoUsage', id);
      return;
    }

    const promo = usage.promo;
    const order = usage.order;

    if (!promo || !order) {
      this.logger.warn(`Missing relations for PromoUsage ${id}`);
      return;
    }

    const user = await this.userModel
      .findById(order.user as Types.ObjectId)
      .lean();

    if (!user) {
      this.logger.warn(
        `User ${(order.user as Types.ObjectId).toHexString()} not found for PromoUsage ${id}`,
      );
      return;
    }

    const clickHouseData: IClickHousePromoUsage = {
      id: usage._id.toString(),
      promoId: (promo as Promo & { _id: Types.ObjectId })._id.toString(),
      promoCode: promo.code,
      promoDiscount: promo.discount,
      orderId: order._id.toString(),
      organicCost: order.organicCost,
      totalCost: usage.cost,
      userId: user._id.toString(),
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phone,
      createdAt: this.formatDate(usage.createdAt),
    };

    await this.replaceInClickhouse('PromoUsage', clickHouseData);
  }

  private async deleteFromClickhouse(
    table: AllowedTable,
    id: string,
  ): Promise<void> {
    try {
      await this.clickhouseClient.exec({
        query: `ALTER TABLE ${table} DELETE WHERE id = {id:String}`,
        query_params: { id },
      });
      this.logger.log(`Deleted record ${id} from table ${table}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete record ${id} from table ${table}`,
        error,
      );
      throw error;
    }
  }

  private async replaceInClickhouse(
    table: AllowedTable,
    data: ClickHouseData,
  ): Promise<void> {
    try {
      await this.clickhouseClient.insert({
        table,
        values: [data],
        format: 'JSONEachRow',
      });
      this.logger.log(
        `Replaced record ${String((data as { id: string }).id)} in table ${table}`,
      );
    } catch (error) {
      this.logger.error(`Failed to replace record in table ${table}`, error);
      throw error;
    }
  }

  private formatDate(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().replace('T', ' ').substring(0, 19);
  }
}
