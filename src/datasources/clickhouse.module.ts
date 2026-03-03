import { Module, Global, OnModuleInit, Inject } from '@nestjs/common';
import { createClient, ClickHouseClient } from '@clickhouse/client';
import { ConfigService } from '@nestjs/config';

export const CLICKHOUSE_CLIENT = 'CLICKHOUSE_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: CLICKHOUSE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ClickHouseClient => {
        return createClient({
          url: configService.get<string>('clickhouseUrl'),
        });
      },
    },
  ],
  exports: [CLICKHOUSE_CLIENT],
})
export class ClickhouseModule implements OnModuleInit {
  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouseClient: ClickHouseClient,
  ) {}

  async onModuleInit() {
    await this.initTables();
  }

  private async initTables() {
    const tableDefinitions = [
      `CREATE TABLE IF NOT EXISTS User (
        id String,
        name String,
        email String,
        phone String,
        bannedAt Nullable(DateTime),
        createdAt DateTime,
        updatedAt DateTime
      ) ENGINE = ReplacingMergeTree(updatedAt)
      ORDER BY id`,

      `CREATE TABLE IF NOT EXISTS Order (
        id String,
        userId String,
        userName String,
        userEmail String,
        userPhone String,
        organicCost Float64,
        totalCost Float64,
        promoId Nullable(String),
        promoCode Nullable(String),
        promoDiscount Nullable(Float64),
        inactiveAt Nullable(DateTime),
        createdAt DateTime,
        updatedAt DateTime
      ) ENGINE = ReplacingMergeTree(updatedAt)
      ORDER BY id`,

      `CREATE TABLE IF NOT EXISTS Promo (
        id String,
        code String,
        discount Float64,
        activeFrom Nullable(DateTime),
        expiredAt Nullable(DateTime),
        globalLimit Nullable(Float64),
        userLimit Nullable(Float64),
        inactiveAt Nullable(DateTime),
        createdBy String,
        createdAt DateTime,
        updatedAt DateTime
      ) ENGINE = ReplacingMergeTree(updatedAt)
      ORDER BY id`,

      `CREATE TABLE IF NOT EXISTS PromoUsage (
        id String,
        promoId String,
        promoCode String,
        promoDiscount Float64,
        orderId String,
        organicCost Float64,
        totalCost Float64,
        userId String,
        userName String,
        userEmail String,
        userPhone String,
        createdAt DateTime
      ) ENGINE = ReplacingMergeTree(createdAt)
      ORDER BY id`,
    ];

    for (const query of tableDefinitions) {
      await this.clickhouseClient.exec({ query });
    }
  }
}
