import redis from './redisClient.js';
import Redlock from 'redlock';

const DEFAULT_TTL = Number(process.env.CACHE_TTL_SECONDS || 60);
const KEY_PREFIX = process.env.CACHE_PREFIX || 'app:cache:';
const KEYS_SET_PREFIX = process.env.CACHE_KEYS_SET_PREFIX || 'app:cache_keys:';

const redlock = new Redlock(
  [redis],
  {
    driftFactor: 0.01,
    retryCount: 3,
    retryDelay: 200,
    retryJitter: 200
  }
);

function makeKey(key) {
  return KEY_PREFIX + key;
}
function keysSetName(namespace) {
  return KEYS_SET_PREFIX + namespace;
}

async function get(key) {
  const raw = await redis.get(makeKey(key));
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return raw;
  }
}

async function set(key, value, ttl = DEFAULT_TTL, namespace = 'default') {
  const payload = typeof value === 'string' ? value : JSON.stringify(value);
  const redisKey = makeKey(key);
  if (ttl > 0) {
    await redis.set(redisKey, payload, 'EX', ttl);
  } else {
    await redis.set(redisKey, payload);
  }
  await redis.sadd(keysSetName(namespace), redisKey);
}

async function del(key) {
  await redis.del(makeKey(key));
}

async function invalidateNamespace(namespace) {
  const setName = keysSetName(namespace);
  const members = await redis.smembers(setName); 
  if (!members || members.length === 0) return 0;
  const pipeline = redis.pipeline();
  members.forEach(k => pipeline.del(k));
  const res = await pipeline.exec();
  return members.length;
}
async function getOrSet(key, loaderFn, ttl = DEFAULT_TTL, namespace = 'default') {
  const cached = await get(key);
  if (cached !== null) return cached;

  const resource = `locks:${KEY_PREFIX}${key}`;
  const lockTtl = 3000; // ms
  let lock;
  try {
    lock = await redlock.acquire([resource], lockTtl);
    const cached2 = await get(key);
    if (cached2 !== null) {
      await lock.release();
      return cached2;
    }
    const value = await loaderFn();
    await set(key, value, ttl, namespace);
    await lock.release();
    return value;
  } catch (err) {
    try {
      if (lock) await lock.release().catch(()=>{});
    } catch(e){}
    const waitMs = 200;
    await new Promise(r => setTimeout(r, waitMs));
    const cached3 = await get(key);
    if (cached3 !== null) return cached3;
    const value = await loaderFn();
    await set(key, value, ttl, namespace);
    return value;
  }
}

export default {
  get,
  set,
  del,
  getOrSet,
  invalidateNamespace,
  makeKey,
};
