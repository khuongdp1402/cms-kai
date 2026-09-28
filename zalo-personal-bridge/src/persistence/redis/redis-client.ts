import { Redis } from 'ioredis';

export function createRedisClient(redisUrl: string): Redis {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  client.on('error', (err: any) => {
    // Suppress unhandled error crash, log appropriately
  });

  return client;
}
