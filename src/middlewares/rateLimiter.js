const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisClient = require('../config/redisClient');

const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:global:',
  }),
  windowMs: 60 * 1000, 
  max: 100, 
  message: {
    success: false,
    error: 'Demasiadas solicitudes, intente más tarde',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Demasiados intentos de login, intente en 15 minutos',
  },
});

const createLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:create:',
  }),
  windowMs: 60 * 1000, 
  max: 10, 
  message: {
    success: false,
    error: 'Demasiadas creaciones, espere un momento',
  },
});

const uploadLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:upload:',
  }),
  windowMs: 60 * 1000,
  max: 5, 
  message: {
    success: false,
    error: 'Demasiados uploads, espere un momento',
  },
});

module.exports = {
  global: globalLimiter,
  auth: authLimiter,
  create: createLimiter,
  upload: uploadLimiter,
};