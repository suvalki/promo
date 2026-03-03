import { Config } from '@/common/types/config.interface';

export default (): Config => {
  return {
    port: +(process.env.PORT ?? 3000),
    secret: process.env.SECRET ?? '',
    mongodbUrl: process.env.MONGODB_URL ?? '',
    clickhouseUrl: process.env.CLICKHOUSE_URL ?? '',
    redisUrl: process.env.REDIS_URL ?? '',
  };
};
