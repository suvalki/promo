import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Promo } from '@/datasources/mongoose/Promo.schema';
import { ClickHouseClient } from '@clickhouse/client';
import { CLICKHOUSE_CLIENT } from '@/datasources/clickhouse.module';
import CreatePromoDto from './dto/create-promo-in.dto';
import UpdatePromoDto from './dto/update-promo-in.dto';
import { AppError } from '@/common/errors/app.error';
import { ErrorCode } from '@/common/errors/error-codes';
import { ClickHouseQueryDto } from '@/common/dto/clickhouse-query.dto';
import { ClickHouseQueryBuilder } from '@/datasources/clickHouse/utils/query-builder';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RedisKeys } from '@/datasources/redis/redis-keys';
import { SyncProcessor } from '@/modules/queues/sync.processor';

const PROMO_CACHE_TTL_MS = 60_000;

@Injectable()
export class PromoService {
  constructor(
    @InjectModel(Promo.name) private readonly promoModel: Model<Promo>,
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouseClient: ClickHouseClient,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly syncProcessor: SyncProcessor,
  ) {}

  async create(userId: string, dto: CreatePromoDto) {
    const promo = new this.promoModel({
      ...dto,
      createdBy: new Types.ObjectId(userId),
    });
    await promo.save();
    await Promise.all([
      this.invalidatePromoCache(userId),
      this.syncProcessor.handlePromo(promo._id.toString()),
    ]);
    return promo;
  }

  async update(id: string, userId: string, dto: UpdatePromoDto) {
    const promo = await this.promoModel.findById(id);
    if (!promo) {
      throw AppError.NotFound(ErrorCode.NOT_FOUND, 'Промокод не найден');
    }
    if (!(promo.createdBy as Types.ObjectId).equals(userId)) {
      throw AppError.Forbidden(
        ErrorCode.FORBIDDEN,
        'У вас нет прав для редактирования этого промокода',
      );
    }

    Object.assign(promo, dto);
    await promo.save();
    await Promise.all([
      this.invalidatePromoCache(userId),
      this.syncProcessor.handlePromo(promo._id.toString()),
    ]);
    return promo;
  }

  async deactivate(id: string, userId: string) {
    const promo = await this.promoModel.findById(id);
    if (!promo) {
      throw AppError.NotFound(ErrorCode.NOT_FOUND, 'Промокод не найден');
    }
    if (!(promo.createdBy as Types.ObjectId).equals(userId)) {
      throw AppError.Forbidden(
        ErrorCode.FORBIDDEN,
        'У вас нет прав для деактивации этого промокода',
      );
    }

    promo.inactiveAt = new Date();
    await promo.save();
    await Promise.all([
      this.invalidatePromoCache(userId),
      this.syncProcessor.handlePromo(promo._id.toString()),
    ]);
    return promo;
  }

  async findOwn(userId: string, queryDto: ClickHouseQueryDto) {
    return this.findStats({ ...queryDto, createdBy: userId });
  }

  async findStats(queryDto: ClickHouseQueryDto & { createdBy?: string }) {
    const { createdBy, ...queryDtoWithoutCreatedBy } = queryDto;

    let cacheKey: string;
    if (createdBy) {
      const version =
        (await this.cacheManager.get<string>(
          RedisKeys.Cache.promoVersion(createdBy),
        )) ?? '0';
      cacheKey = RedisKeys.Cache.promoList({ ...queryDto, _v: version });
    } else {
      cacheKey = RedisKeys.Cache.promoList(queryDto);
    }

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const baseQuery = `
      SELECT
        p.id,
        p.code,
        p.discount,
        p.activeFrom,
        p.expiredAt,
        p.globalLimit,
        p.userLimit,
        p.inactiveAt,
        p.createdAt,
        p.createdBy,
        count(NULLIF(pu.id, '')) as usageCount,
        coalesce(sum(pu.organicCost - pu.totalCost), 0) as totalDiscountSum,
        coalesce(avg(pu.totalCost), 0) as avgTotalCost
      FROM Promo p FINAL
      LEFT JOIN (
        SELECT pu.id, pu.promoId, pu.organicCost, pu.totalCost
        FROM PromoUsage pu FINAL
        JOIN Order o FINAL ON pu.orderId = o.id
        WHERE isNull(o.inactiveAt)
      ) pu ON p.id = pu.promoId
      WHERE isNull(p.inactiveAt)
      ${queryDto.createdBy ? 'AND p.createdBy = {userId: String}' : ''}
      GROUP BY 
        p.id, 
        p.code, 
        p.discount, 
        p.activeFrom, 
        p.expiredAt, 
        p.globalLimit, 
        p.userLimit, 
        p.inactiveAt, 
        p.createdAt,
        p.createdBy
    `;

    const builder = new ClickHouseQueryBuilder(
      baseQuery,
      createdBy ? { userId: createdBy } : {},
    ).applyQueryOptions(queryDtoWithoutCreatedBy, {
      dateField: 'createdAt',
      searchableFields: ['code'],
      allowedFilterFields: ['id', 'code', 'createdBy'],
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

    await this.cacheManager.set(cacheKey, result, PROMO_CACHE_TTL_MS);
    return result;
  }

  public async invalidatePromoCache(userId: string) {
    const newVersion = Date.now().toString();
    await Promise.all([
      this.cacheManager.del(RedisKeys.Cache.userStats(userId)),
      this.cacheManager.set(
        RedisKeys.Cache.promoVersion(userId),
        newVersion,
        PROMO_CACHE_TTL_MS * 2,
      ),
    ]);
  }
}
