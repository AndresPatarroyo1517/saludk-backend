import cache from '../config/cache.js';

/**
 * Middleware de caché distribuido mejorado para Express
 * - Cachea respuestas GET de forma segura
 * - Invalida caché en mutaciones (POST, PUT, PATCH, DELETE)
 * - Manejo robusto de errores
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
        // Invalidar después de que la operación sea exitosa
        const originalJson = res.json.bind(res);
        res.json = async (body) => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              await cache.invalidateNamespace(namespace);
            }
          } catch (err) {
            console.error(`Error invalidando namespace ${namespace}:`, err.message);
            // No re-lanzar el error para no afectar la respuesta
          }
          return originalJson(body);
        };
        return next();
      } catch (err) {
        console.error(`Error en cacheMiddleware (mutación):`, err.message);
        return next();
      }
    }

    // ⚡ Si es GET, aplicar caché
    if (method === 'GET') {
      try {
        const cached = await cache.get(key);
        if (cached !== null) {
          return res.json(cached);
        }

        // Interceptar respuesta para guardar en caché
        const originalJson = res.json.bind(res);
        let responseSent = false;
        
        res.json = async (body) => {
          if (responseSent) return; // Evitar múltiples ejecuciones
          responseSent = true;

          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              await cache.set(key, body, ttl, namespace);
            }
          } catch (err) {
            console.error('Error guardando en caché:', err.message);
            // No re-lanzar el error para no afectar la respuesta
          }
          
          return originalJson(body);
        };

        return next();
      } catch (err) {
        console.error('Error en cacheMiddleware (GET):', err.message);
        // En caso de error, continuar sin caché
        return next();
      }
    }

    // 🕊️ Para otros métodos, continuar normalmente
    return next();
  };
}

/**
 * Generador de claves basado en URL y parámetros
 */
export function defaultKeyGenerator(req) {
  const { originalUrl, params, query } = req;
  return `${originalUrl}:${JSON.stringify(params)}:${JSON.stringify(query)}`;
}

/**
 * Middleware de caché con configuración por defecto
 */
export function defaultCacheMiddleware(ttl = 60, namespace = 'default') {
  return cacheMiddleware(defaultKeyGenerator, ttl, namespace);
}