import { AppError } from '@/common/errors/app.error';
import { ClickHouseQueryDto } from '@/common/dto/clickhouse-query.dto';
import { ErrorCode } from '@/common/errors/error-codes';
import { CLICKHOUSE_CLIENT } from '@/datasources/clickhouse.module';
import { ClickHouseQueryBuilder } from '@/datasources/clickHouse/utils/query-builder';
import { Order } from '@/datasources/mongoose/Order.schema';
import { Promo } from '@/datasources/mongoose/Promo.schema';
import { PromoUsage } from '@/datasources/mongoose/PromoUsage.schema';
import { RedisKeys } from '@/datasources/redis/redis-keys';
import { RedisLockService } from '@/datasources/redis/redis-lock.service';
import { SyncProcessor } from '@/modules/queues/sync.processor';
import { PromoService } from '@/modules/promo/promo.service';
import { ClickHouseClient } from '@clickhouse/client';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import CreateOrderInDto from './dto/create-order-in.dto';
import UpdateOrderInDto from './dto/update-order-in.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

const ORDER_CACHE_TTL_MS = 60_000;

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Promo.name) private readonly promoModel: Model<Promo>,
    @InjectModel(PromoUsage.name)
    private readonly promoUsageModel: Model<PromoUsage>,
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouseClient: ClickHouseClient,
    private readonly redisLockService: RedisLockService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly syncProcessor: SyncProcessor,
    private readonly promoService: PromoService,
  ) {}

  async create(userId: string, dto: CreateOrderInDto) {
    const order = new this.orderModel({
      user: new Types.ObjectId(userId),
      organicCost: dto.organicCost,
    });
    await order.save();
    await Promise.all([
      this.invalidateOrderCache(userId),
      this.syncProcessor.handleOrder(order._id.toString()),
    ]);
    return order;
  }

  async update(orderId: string, userId: string, dto: UpdateOrderInDto) {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      user: new Types.ObjectId(userId),
    });

    if (!order) {
      throw AppError.NotFound(ErrorCode.NOT_FOUND, 'Заказ не найден');
    }

    const existingUsage = await this.promoUsageModel.findOne({
      'order._id': order._id,
    });

    if (existingUsage) {
      throw AppError.BadRequest(
        ErrorCode.BAD_REQUEST,
        'Нельзя редактировать заказ, к которому применен промокод',
      );
    }

    order.organicCost = dto.organicCost;
    await order.save();
    await Promise.all([
      this.invalidateOrderCache(userId),
      this.syncProcessor.handleOrder(order._id.toString()),
    ]);
    return order;
  }

  async deactivate(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      user: new Types.ObjectId(userId),
    });

    if (!order) {
      throw AppError.NotFound(ErrorCode.NOT_FOUND, 'Заказ не найден');
    }

    order.inactiveAt = new Date();
    await order.save();

    const usage = await this.promoUsageModel.findOne({
      'order._id': order._id,
    });

    if (usage) {
      await this.promoUsageModel.updateMany(
        { 'order._id': order._id },
        { $set: { 'order.inactiveAt': order.inactiveAt } },
      );
    }

    await Promise.all([
      this.invalidateOrderCache(userId),
      this.syncProcessor.handleOrder(order._id.toString()),
      usage
        ? this.promoService.invalidatePromoCache(
            (usage.promo.createdBy as Types.ObjectId).toString(),
          )
        : Promise.resolve(),
    ]);
    return order;
  }

  async applyPromocode(orderId: string, userId: string, code: string) {
    const lockKey = RedisKeys.Lock.applyPromo(userId, code);
    const lock = await this.redisLockService.acquire(lockKey, 10000);

    try {
      const order = await this.orderModel.findOne({
        _id: new Types.ObjectId(orderId),
        user: new Types.ObjectId(userId),
      });

      if (!order || order.inactiveAt) {
        throw AppError.NotFound(ErrorCode.NOT_FOUND, 'Заказ не найден');
      }

      const existingUsage = await this.promoUsageModel.findOne({
        'order._id': order._id,
      });

      if (existingUsage) {
        throw AppError.BadRequest(
          ErrorCode.BAD_REQUEST,
          'К этому заказу уже применен промокод',
        );
      }

      const promo = await this.promoModel.findOne({ code, inactiveAt: null });
      if (!promo) {
        throw AppError.NotFound(ErrorCode.NOT_FOUND, 'Промокод не найден');
      }

      if (promo.inactiveAt) {
        throw AppError.BadRequest(ErrorCode.BAD_REQUEST, 'Промокод неактивен');
      }

      const now = new Date();
      if (promo.activeFrom && promo.activeFrom > now) {
        throw AppError.BadRequest(
          ErrorCode.BAD_REQUEST,
          'Промокод еще не действует',
        );
      }
      if (promo.expiredAt && promo.expiredAt < now) {
        throw AppError.BadRequest(ErrorCode.BAD_REQUEST, 'Промокод истек');
      }

      const activeUsageQuery = {
        'promo._id': promo._id,
        $or: [
          { 'order.inactiveAt': { $exists: false } },
          { 'order.inactiveAt': null },
        ],
      };

      const globalUsageCount =
        await this.promoUsageModel.countDocuments(activeUsageQuery);
      if (
        promo.globalLimit &&
        promo.globalLimit > 0 &&
        globalUsageCount >= promo.globalLimit
      ) {
        throw AppError.BadRequest(
          ErrorCode.BAD_REQUEST,
          'Лимит использований промокода исчерпан',
        );
      }

      const userUsageCount = await this.promoUsageModel.countDocuments({
        ...activeUsageQuery,
        'order.user._id': new Types.ObjectId(userId),
      });

      if (
        promo.userLimit &&
        promo.userLimit > 0 &&
        userUsageCount >= promo.userLimit
      ) {
        throw AppError.BadRequest(
          ErrorCode.BAD_REQUEST,
          'Вы уже исчерпали свой лимит использований этого промокода',
        );
      }

      const discountAmount = (order.organicCost * promo.discount) / 100;
      const totalCost = Math.max(0, order.organicCost - discountAmount);

      const usage = new this.promoUsageModel({
        promo: promo.toObject(),
        order: order.toObject(),
        cost: totalCost,
      });

      await usage.save();
      await Promise.all([
        this.invalidateOrderCache(userId),
        this.promoService.invalidatePromoCache(
          (promo.createdBy as Types.ObjectId).toString(),
        ),
        this.syncProcessor.handleOrder(order._id.toString()),
        this.syncProcessor.handlePromoUsage(usage._id.toString()),
      ]);

      return order;
    } finally {
      await lock.release();
    }
  }

  async findOwn(userId: string, queryDto: ClickHouseQueryDto) {
    return this.findAll({ ...queryDto, userId });
  }

  private async invalidateOrderCache(userId: string) {
    const newVersion = Date.now().toString();
    await Promise.all([
      this.cacheManager.del(RedisKeys.Cache.userStats(userId)),
      this.cacheManager.set(
        RedisKeys.Cache.orderVersion(userId),
        newVersion,
        ORDER_CACHE_TTL_MS * 2,
      ),
    ]);
  }

  async findAll(queryDto: ClickHouseQueryDto & { userId?: string }) {
    const { userId, ...queryDtoWithoutUserId } = queryDto;

    let cacheKey: string;
    if (userId) {
      const version =
        (await this.cacheManager.get<string>(
          RedisKeys.Cache.orderVersion(userId),
        )) ?? '0';
      cacheKey = RedisKeys.Cache.orderList({ ...queryDto, _v: version });
    } else {
      cacheKey = RedisKeys.Cache.orderList(queryDto);
    }

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const baseQuery = `
      SELECT
        id,
        userId,
        userName,
        userEmail,
        userPhone,
        organicCost,
        totalCost,
        promoId,
        promoCode,
        promoDiscount,
        inactiveAt,
        createdAt,
        updatedAt
      FROM Order FINAL
      WHERE isNull(inactiveAt)
      ${userId ? 'AND userId = {userId: String}' : ''}
    `;

    const builder = new ClickHouseQueryBuilder(
      baseQuery,
      userId ? { userId } : {},
    ).applyQueryOptions(queryDtoWithoutUserId, {
      dateField: 'createdAt',
      searchableFields: ['promoCode', 'id', 'userName'],
      allowedFilterFields: ['id', 'promoCode', 'promoId', 'userId'],
    });

    const { query, query_params } = builder.build();
    const { query: countQuery, query_params: countParams } =
      builder.buildCount();

    const [dataResultSet, countResultSet] = await Promise.all([
      this.clickhouseClient.query({
        query,
        query_params,
        format: 'JSONEachRow',
      }),
      this.clickhouseClient.query({
        query: countQuery,
        query_params: countParams,
        format: 'JSONEachRow',
      }),
    ]);

    const data = await dataResultSet.json();
    const countRows: Array<{ total: string | number }> =
      await countResultSet.json();
    const totalCount = Number(countRows[0]?.total ?? 0);

    const result = {
      data,
      totalCount,
      page: queryDto.page || 1,
      pageSize: queryDto.pageSize || 10,
      totalPages: Math.ceil(totalCount / (queryDto.pageSize || 10)),
    };

    await this.cacheManager.set(cacheKey, result, ORDER_CACHE_TTL_MS);
    return result;
  }
}
