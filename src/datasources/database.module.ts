import { Global, Module } from '@nestjs/common';
import { MongoDbModule } from '@/datasources/mongoose.module';
import { ClickhouseModule } from '@/datasources/clickhouse.module';
import { RedisModule } from '@/datasources/redis.module';
import { BullMqModule } from '@/datasources/bullmq.module';

@Global()
@Module({
  imports: [MongoDbModule, ClickhouseModule, RedisModule, BullMqModule],
  exports: [MongoDbModule, ClickhouseModule, RedisModule, BullMqModule],
})
export class DatabaseModule {}
