const cache = require('../config/cache');

function cacheMiddleware({ ttl = undefined, namespace = 'default', keyGenerator = null } = {}) {
  return async function (req, res, next) {
    if (req.method !== 'GET') return next();

    const key = keyGenerator ? keyGenerator(req) : `${req.originalUrl}`;
    try {
      const cached = await cache.get(key);
      if (cached !== null) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
    } catch (err) {
      console.error('Cache read error', err);
    }
    const oldJson = res.json.bind(res);
    res.json = async function (body) {
      try {
        cache.set(key, body, ttl, namespace).catch(e => {
          console.error('Error guardando en cache:', e);
        });
      } catch (e) {
        console.error('Error durante cache.save:', e);
      }
      res.set('X-Cache', 'MISS');
      return oldJson(body);
    };

    next();
  };
}

module.exports = cacheMiddleware;
