import { Inject, Injectable } from '@nestjs/common';
import { ClickHouseClient } from '@clickhouse/client';
import { CLICKHOUSE_CLIENT } from '@/datasources/clickhouse.module';
import { ClickHouseQueryBuilder } from '@/datasources/clickHouse/utils/query-builder';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RedisKeys } from '@/datasources/redis/redis-keys';

const USER_STATS_CACHE_TTL_MS = 120_000;

/**
 * Сервис, отвечающий за операции, связанные с аналитикой.
 * Предоставляет методы для получения агрегированных статистических данных.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouseClient: ClickHouseClient,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Получает агрегированные аналитические данные для конкретного пользователя.
   * Извлекает данные пользователя вместе с общей суммой его трат и количеством заказов из ClickHouse.
   * Использует кэширование Redis для повышения производительности и снижения нагрузки на базу данных.
   *
   * @param {string} userId - Уникальный идентификатор пользователя.
   * @returns {Promise<any>} Promise, который содержит агрегированные аналитические данные пользователя.
   */
  async getMe(userId: string) {
    const cacheKey = RedisKeys.Cache.userStats(userId);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const baseQuery = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.phone, 
        u.createdAt,
        sum(if(notEmpty(o.id) AND isNull(o.inactiveAt), o.totalCost, 0)) as totalSpent,
        countIf(notEmpty(o.id) AND isNull(o.inactiveAt)) as totalOrders
      FROM User u FINAL
      LEFT JOIN Order o FINAL ON u.id = o.userId AND isNull(o.inactiveAt)
      WHERE u.id = {userId: String}
      GROUP BY u.id, u.name, u.email, u.phone, u.createdAt
    `;

    const builder = new ClickHouseQueryBuilder(baseQuery, { userId });
    const { query, query_params } = builder.build();

    const resultSet = await this.clickhouseClient.query({
      query,
      query_params,
      format: 'JSONEachRow',
    });

    const data = await resultSet.json<{ id: string }[]>();
    const result = data[0];

    if (result) {
      await this.cacheManager.set(cacheKey, result, USER_STATS_CACHE_TTL_MS);
    }

    return result;
  }
}
