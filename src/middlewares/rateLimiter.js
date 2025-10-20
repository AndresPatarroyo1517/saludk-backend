const { RateLimiterMemory } = require('rate-limiter-flexible');
const redisClient = require('../config/redisClient');

const globalLimiter = new RateLimiterMemory({
  store: redisClient,
  windowMs: 60 * 1000, 
  max: 100, 
  message: {
    success: false,
    error: 'Demasiadas solicitudes, intente más tarde',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = new RateLimiterMemory({
  store: redisClient,
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Demasiados intentos de login, intente en 15 minutos',
  },
});

const createLimiter = new RateLimiterMemory({
  store: redisClient,
  windowMs: 60 * 1000, 
  max: 10, 
  message: {
    success: false,
    error: 'Demasiadas creaciones, espere un momento',
  },
});

const uploadLimiter = new RateLimiterMemory({
  store: redisClient,
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