import Redis from 'ioredis';
import logger from '../utils/logger.js'

const nodesEnv = process.env.REDIS_NODES || '';
const password = process.env.REDIS_PASSWORD || undefined;

let client;

if (nodesEnv) {
  const nodes = nodesEnv.split(',').map(n => {
    const [host, port] = n.split(':');
    return { host, port: Number(port) };
  });
  client = new Redis.Cluster(nodes, {
    redisOptions: {
      password,
      maxRetriesPerRequest: null,
      connectTimeout: 10000
    }
  });
  logger.info && logger.info('Iniciando Redis Cluster con nodos:', nodes);
} else {
  client = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password,
    retryStrategy: times => Math.min(times * 50, 2000),
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: 10000
  });
  logger.info && logger.info('Iniciando Redis single-node');
}

client.on('connect', () => logger.info && logger.info('Redis conectada (connect)'));
client.on('ready', () => logger.info && logger.info('Redis lista (ready)'));
client.on('error', (err) => logger.error && logger.error('Redis error:', err));
client.on('close', () => logger.warn && logger.warn('Redis closed'));

async function shutdown() {
  try {
    logger.info && logger.info('Cerrando Redis...');
    await client.quit();
  } catch (err) {
    logger.error && logger.error('Error al cerrar Redis, forzando disconnect:', err);
    client.disconnect();
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = client;
