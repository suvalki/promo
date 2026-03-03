export const RedisKeys = {
  Cache: {
    userStats: (userId: string) => `cache:user_stats:${userId}`,
    promoList: (params: object) => `cache:promo_list:${JSON.stringify(params)}`,
    orderList: (params: object) => `cache:order_list:${JSON.stringify(params)}`,
    orderVersion: (userId: string) => `cache:order_version:${userId}`,
    promoVersion: (userId: string) => `cache:promo_version:${userId}`,
  },

  Auth: {
    refreshToken: (userId: string, deviceId: string) =>
      `auth:rt:${userId}:${deviceId}`,
  },

  RateLimit: {
    user: (userId: string) => `throttler:user:${userId}`,
    ip: (ip: string) => `throttler:ip:${ip}`,
  },

  Lock: {
    applyPromo: (userId: string, promoCode: string) =>
      `lock:apply_promo:${userId}:${promoCode}`,
  },

  Bootstrap: {
    lastSync: () => `bootstrap:last_sync`,
  },
};
