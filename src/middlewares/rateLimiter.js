import { RateLimiterMemory } from 'rate-limiter-flexible';
import redisClient from '../config/redisClient.js';

/* ===========================================================
   ⚙️ 1. Configuración de limitadores
   =========================================================== */
const globalLimiter = new RateLimiterMemory({
  store: redisClient,
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Demasiadas solicitudes, intente más tarde',
  },
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

/* ===========================================================
   🧠 2. Función para generar middlewares Express
   =========================================================== */
function createRateLimiterMiddleware(limiter) {
  return async (req, res, next) => {
    try {
      const key = req.ip; // o req.user.id si tienes autenticación

      await limiter.consume(key); // resta puntos
      return next();
    } catch (err) {
      const retrySecs = Math.ceil((err.msBeforeNext || 0) / 1000);
      if (retrySecs > 0) res.set('Retry-After', retrySecs);

      const message = limiter.message || {
        success: false,
        error: 'Demasiadas solicitudes. Intente más tarde.',
      };

      return res.status(429).json(message);
    }
  };
}

/* ===========================================================
   🚀 3. Exporta middlewares listos para usar
   =========================================================== */
export default {
  rateLimit: {
    global: createRateLimiterMiddleware(globalLimiter),
    auth: createRateLimiterMiddleware(authLimiter),
    create: createRateLimiterMiddleware(createLimiter),
    upload: createRateLimiterMiddleware(uploadLimiter),
  },
};
