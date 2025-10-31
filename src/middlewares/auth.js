import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

/**
 * Middleware de autenticación
 * Verifica el token JWT y agrega los datos del usuario a req.user
 */
export const authenticateToken = (req, res, next) => {
  try {
    // Obtener el token del header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido.'
      });
    }

    // Verificar el token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        logger.warn(`Token inválido: ${err.message}`);
        return res.status(403).json({
          success: false,
          message: 'Token inválido o expirado.'
        });
      }

      // Agregar los datos del usuario al request
      req.user = user;
      next();
    });
  } catch (error) {
    logger.error(`Error en authenticateToken: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar autenticación.'
    });
  }
};

/**
 * Middleware para verificar roles específicos
 * Uso: authorize(['ADMIN', 'DIRECTOR_MEDICO'])
 */
export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado.'
      });
    }

    // Convertir a array si se pasa un solo rol
    const rolesArray = typeof roles === 'string' ? [roles] : roles;

    if (rolesArray.length && !rolesArray.includes(req.user.rol)) {
      logger.warn(`Usuario ${req.user.id} intentó acceder sin permisos. Rol: ${req.user.rol}, Requerido: ${rolesArray}`);
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción.'
      });
    }

    next();
  };
};

/**
 * Middleware específico para admin
 */
export const requireAdmin = authorize(['ADMIN']);

/**
 * Middleware específico para director médico
 */
export const requireDirectorMedico = authorize(['DIRECTOR_MEDICO', 'ADMIN']);

/**
 * Middleware para pacientes
 */
export const requirePaciente = authorize(['PACIENTE']);