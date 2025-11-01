import logger from '../utils/logger.js';

/**
 * Middleware para verificar roles de usuario
 * @param {...string} allowedRoles - Roles permitidos
 * @returns {Function} Middleware de Express
 */
export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      logger.security('UNAUTHORIZED_ACCESS', {
        userId: req.user.userId,
        userRole: req.user.rol,
        requiredRoles: allowedRoles,
        attemptedResource: req.path,
        ip: req.ip
      });

      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para acceder a este recurso'
      });
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario es dueño del recurso
 * @param {string} paramName - Nombre del parámetro que contiene el ID del recurso
 * @returns {Function} Middleware de Express
 */
export const checkOwnership = (paramName = 'id') => {
  return (req, res, next) => {
    const resourceId = req.params[paramName];
    const userId = req.user.userId;

    // Los administradores y directores médicos pueden acceder a todo
    if (['ADMIN', 'DIRECTOR_MEDICO'].includes(req.user.rol)) {
      return next();
    }

    // Verificar que el ID del recurso coincida con el ID del usuario
    if (resourceId !== userId) {
      logger.security('OWNERSHIP_VIOLATION', {
        userId,
        attemptedResourceId: resourceId,
        resource: req.path,
        ip: req.ip
      });

      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para acceder a este recurso'
      });
    }

    next();
  };
};

export default {
  checkRole,
  checkOwnership
};