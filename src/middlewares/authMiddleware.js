import { verifyAccessToken } from '../utils/tokenGenerator.js';
import logger from '../utils/logger.js';

/**
 * Middleware para verificar el token de autenticación
 */
export const authMiddleware = (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }

    // Formato: "Bearer TOKEN"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'Formato de token inválido'
      });
    }

    const token = parts[1];

    // Verificar token
    const decoded = verifyAccessToken(token);

    // Agregar datos del usuario al request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      rol: decoded.rol
    };

    // Configurar usuario_id en el contexto de Sequelize para auditoría
    req.app.locals.currentUserId = decoded.userId;

    next();
  } catch (error) {
    logger.security('AUTHENTICATION_FAILED', {
      error: error.message,
      ip: req.ip
    });

    if (error.message === 'Token expirado') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1];
    const decoded = verifyAccessToken(token);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      rol: decoded.rol
    };

    next();
  } catch (error) {
    // Si el token es inválido, simplemente continuar sin usuario
    next();
  }
};

export default {
  authMiddleware,
  optionalAuth
};