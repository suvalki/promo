import { CLICKHOUSE_CLIENT } from '@/datasources/clickhouse.module';
import { REDIS_CLIENT } from '@/datasources/redis.module';
import { MainModule } from '@/main.module';
import { ClickHouseClient } from '@clickhouse/client';
import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import { Connection } from 'mongoose';

describe('App Connectivity (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MainModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 10000);

  afterAll(async () => {
    await app.close();
  });

  it('should be connected to MongoDB', () => {
    const connection = app.get<Connection>(getConnectionToken());
    expect(connection.readyState).toBe(1); // 1 = connected
  });

  it('should be connected to Redis', async () => {
    const redis = app.get<Redis>(REDIS_CLIENT);
    const result = await redis.ping();
    expect(result).toBe('PONG');
  });

  it('should be connected to ClickHouse', async () => {
    const clickhouse = app.get<ClickHouseClient>(CLICKHOUSE_CLIENT);
    const result = await clickhouse.ping();
    expect(result.success).toBe(true);
  });
});
