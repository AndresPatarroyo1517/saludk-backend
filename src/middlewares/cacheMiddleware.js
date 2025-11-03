import cache from '../config/cache.js';

/**
 * Middleware de caché distribuido para Express
 * - Cachea respuestas GET
 * - Invalida caché en mutaciones (POST, PUT, PATCH, DELETE)
 *
 * @param {Function} keyGenerator - Función que genera la clave del caché a partir del req
 * @param {number} ttl - Tiempo de vida del caché (en segundos)
 * @param {string} namespace - Grupo lógico para invalidación
 */
export function cacheMiddleware(keyGenerator, ttl = 60, namespace = 'default') {
  return async (req, res, next) => {
    const method = req.method.toUpperCase();
    const key = keyGenerator(req);

    // 🧹 Si es una mutación, limpiar el namespace y continuar
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      try {
        await cache.invalidateNamespace(namespace);
        return next();
      } catch (err) {
        console.error(`Error invalidando namespace ${namespace}:`, err.message);
        return next();
      }
    }

    // ⚡ Si es GET, aplicar caché
    if (method === 'GET') {
      try {
        const cached = await cache.get(key);
        if (cached) {
          return res.json(cached);
        }

        // Interceptar respuesta para guardar en caché
        const originalJson = res.json.bind(res);
        res.json = async (body) => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              await cache.set(key, body, ttl, namespace);
            }
          } catch (err) {
            console.error('Error guardando en caché:', err.message);
          }
          return originalJson(body);
        };

        return next();
      } catch (err) {
        console.error('Error en cacheMiddleware:', err.message);
        return next();
      }
    }

    // 🕊️ Para otros métodos, continuar normalmente
    return next();
  };
}
