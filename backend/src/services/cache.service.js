const config = require('../config');

let _redis = null;

async function getClient() {
  if (_redis) return _redis;

  if (!config.redis.enabled) {
    return null;
  }

  try {
    const redis = require('ioredis');
    _redis = new redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
    });
    await _redis.connect();
    return _redis;
  } catch {
    return null;
  }
}

class CacheService {
  async get(key) {
    const client = await getClient();
    if (!client) return null;
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key, value, ttlSeconds = 300) {
    const client = await getClient();
    if (!client) return;
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key) {
    const client = await getClient();
    if (!client) return;
    await client.del(key);
  }

  async increment(key, ttlSeconds = 60) {
    const client = await getClient();
    if (!client) return 0;
    const val = await client.incr(key);
    if (val === 1 && ttlSeconds) {
      await client.expire(key, ttlSeconds);
    }
    return val;
  }
}

module.exports = new CacheService();
