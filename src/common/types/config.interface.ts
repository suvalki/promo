export interface Config {
  port: number;
  secret: string;
  mongodbUrl: string;
  clickhouseUrl: string;
  redisUrl: string;
}
