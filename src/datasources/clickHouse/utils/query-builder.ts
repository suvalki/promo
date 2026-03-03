import { ClickHouseQueryDto } from '@/common/dto/clickhouse-query.dto';

export interface QueryBuilderOptions {
  dateField?: string;
  searchableFields?: string[];
  allowedFilterFields?: string[];
}

export class ClickHouseQueryBuilder<TParams extends Record<string, unknown>> {
  private baseQuery: string;
  private whereClauses: string[] = [];
  private orderClauses: string[] = [];
  private limitCount?: number;
  private offsetCount?: number;
  public queryParams: Record<string, unknown> = {};

  constructor(baseQuery: string, params?: TParams) {
    this.baseQuery = baseQuery;
    if (params) {
      this.queryParams = { ...params };
    }
  }

  where(clause: string, params?: Record<string, unknown>): this {
    this.whereClauses.push(`(${clause})`);
    if (params) {
      this.queryParams = { ...this.queryParams, ...params };
    }
    return this;
  }

  orderBy(field: string, order: 'ASC' | 'DESC' | 'asc' | 'desc' = 'ASC'): this {
    this.orderClauses.push(`${field} ${order.toUpperCase()}`);
    return this;
  }

  limit(limit: number): this {
    this.limitCount = limit;
    return this;
  }

  offset(offset: number): this {
    this.offsetCount = offset;
    return this;
  }

  applyQueryOptions(
    dto: Partial<ClickHouseQueryDto> & Record<string, unknown>,
    options: QueryBuilderOptions = {},
  ): this {
    const dateField = options.dateField || 'createdAt';
    const searchableFields = options.searchableFields || [];
    const allowedFilterFields = options.allowedFilterFields;

    if (dto.dateFrom) {
      const ds =
        dto.dateFrom instanceof Date
          ? dto.dateFrom.toISOString().slice(0, 19).replace('T', ' ')
          : dto.dateFrom;
      this.where(`${dateField} >= {dateFrom: DateTime}`, { dateFrom: ds });
    }

    if (dto.dateTo) {
      const ds =
        dto.dateTo instanceof Date
          ? dto.dateTo.toISOString().slice(0, 19).replace('T', ' ')
          : dto.dateTo;
      this.where(`${dateField} <= {dateTo: DateTime}`, { dateTo: ds });
    }

    if (dto.search && searchableFields.length > 0) {
      const searchConditions = searchableFields.map(
        (field, i) => `${field} ILIKE {search_${i}: String}`,
      );
      const searchParams = searchableFields.reduce(
        (acc, _, i) => {
          acc[`search_${i}`] = `%${dto.search}%`;
          return acc;
        },
        {} as Record<string, unknown>,
      );

      this.where(`(${searchConditions.join(' OR ')})`, searchParams);
    }

    const reservedKeys = [
      'page',
      'pageSize',
      'sortBy',
      'sortOrder',
      'dateFrom',
      'dateTo',
      'search',
    ];

    for (const [key, value] of Object.entries(dto)) {
      if (
        !reservedKeys.includes(key) &&
        value !== undefined &&
        value !== null &&
        (!allowedFilterFields || allowedFilterFields.includes(key))
      ) {
        this.where(`${key} = {exact_${key}: String}`, {
          [`exact_${key}`]: String(value),
        });
      }
    }

    if (dto.sortBy) {
      this.orderBy(dto.sortBy, dto.sortOrder || 'DESC');
    }

    const page = Math.max(1, dto.page || 1);
    const pageSize = Math.min(100, Math.max(1, dto.pageSize || 10));

    this.limit(pageSize);
    this.offset((page - 1) * pageSize);

    return this;
  }

  build(): { query: string; query_params: Record<string, unknown> } {
    let finalQuery = this.buildBaseWithFilters();

    if (this.orderClauses.length > 0) {
      finalQuery += `\nORDER BY ${this.orderClauses.join(', ')}`;
    }

    if (this.limitCount !== undefined) {
      finalQuery += `\nLIMIT ${this.limitCount}`;
    }

    if (this.offsetCount !== undefined) {
      finalQuery += `\nOFFSET ${this.offsetCount}`;
    }

    return {
      query: finalQuery,
      query_params: this.sanitizeParams(this.queryParams),
    };
  }

  buildCount(): { query: string; query_params: Record<string, unknown> } {
    const baseWithFilters = this.buildBaseWithFilters();
    const countQuery = `SELECT count() as total FROM (${baseWithFilters})`;
    return {
      query: countQuery,
      query_params: this.sanitizeParams(this.queryParams),
    };
  }

  private sanitizeParams(
    params: Record<string, unknown>,
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null),
    );
  }

  private buildBaseWithFilters(): string {
    let finalQuery = `SELECT * FROM (\n  ${this.baseQuery}\n)`;

    if (this.whereClauses.length > 0) {
      finalQuery += `\nWHERE ${this.whereClauses.join(' AND ')}`;
    }

    return finalQuery;
  }
}
