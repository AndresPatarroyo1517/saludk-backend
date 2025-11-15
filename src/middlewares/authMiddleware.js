import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import db from '../models/index.js';

const { Medico, Paciente, Usuario } = db;

const jwtConfig = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  rememberMeExpiry: '30d',
};

/**
 * Genera Access Token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      rol: payload.rol,
      type: 'access'
    },
    jwtConfig.accessTokenSecret,
    { expiresIn: jwtConfig.accessTokenExpiry }
  );
};

/**
 * Genera Refresh Token
 */
export const generateRefreshToken = (payload, rememberMe = false) => {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      type: 'refresh'
    },
    jwtConfig.refreshTokenSecret,
    { 
      expiresIn: rememberMe ? jwtConfig.rememberMeExpiry : jwtConfig.refreshTokenExpiry 
    }
  );
};

/**
 * Verifica Access Token
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.accessTokenSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const err = new Error('Token expirado');
      err.code = 'TOKEN_EXPIRED';
      throw err;
    }
    const err = new Error('Token inválido');
    err.code = 'INVALID_TOKEN';
    throw err;
  }
};

/**
 * Verifica Refresh Token
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.refreshTokenSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const err = new Error('Refresh token expirado');
      err.code = 'REFRESH_TOKEN_EXPIRED';
      throw err;
    }
    const err = new Error('Refresh token inválido');
    err.code = 'INVALID_REFRESH_TOKEN';
    throw err;
  }
};

/**
 * Configura cookies de autenticación
 */
export const setAuthCookies = (res, accessToken, refreshToken, rememberMe = false) => {
  const accessTokenMaxAge = 15 * 60 * 1000; // 15 minutos
  const refreshTokenMaxAge = rememberMe 
    ? 30 * 24 * 60 * 60 * 1000  // 30 días
    : 7 * 24 * 60 * 60 * 1000;   // 7 días

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: accessTokenMaxAge
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: refreshTokenMaxAge
  });
};

/**
 * Limpia cookies de autenticación
 */
export const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
};

/**
 * Middleware de autenticación - MEJORADO CON CARGA DE ENTIDADES
 * 
 * Después de este middleware, req.user tendrá la siguiente estructura según el rol:
 * 
 * ROL MEDICO:
 * req.user = {
 *   userId: UUID,
 *   email: string,
 *   rol: 'MEDICO',
 *   medico: {
 *     id: UUID,
 *     nombres: string,
 *     apellidos: string,
 *     especialidad: string,
 *     registro_medico: string
 *   }
 * }
 * 
 * ROL PACIENTE:
 * req.user = {
 *   userId: UUID,
 *   email: string,
 *   rol: 'PACIENTE',
 *   paciente: {
 *     id: UUID,
 *     nombres: string,
 *     apellidos: string,
 *     numero_identificacion: string,
 *     tipo_sangre: string
 *   }
 * }
 * 
 * ROL DIRECTOR_MEDICO:
 * req.user = {
 *   userId: UUID,
 *   email: string,
 *   rol: 'DIRECTOR_MEDICO'
 * }
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // Intentar obtener token de cookie primero, luego de header
    let token = req.cookies?.accessToken;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado',
        code: 'MISSING_TOKEN'
      });
    }

    const decoded = verifyAccessToken(token);

    // Estructura base del usuario
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      rol: decoded.rol
    };

    // Cargar entidad según el rol
    switch (decoded.rol) {
      case 'MEDICO': {
        const medico = await Medico.findOne({ 
          where: { usuario_id: decoded.userId },
          attributes: ['id', 'nombres', 'apellidos', 'especialidad', 'registro_medico', 'disponible']
        });
        
        if (!medico) {
          logger.error('MEDICO_NOT_FOUND', {
            userId: decoded.userId,
            email: decoded.email
          });
          return res.status(403).json({
            success: false,
            message: 'Perfil de médico no encontrado. Contacte al administrador.',
            code: 'MEDICO_NOT_FOUND'
          });
        }

        if (!medico.disponible) {
          logger.security('MEDICO_DISABLED_ACCESS', {
            medicoId: medico.id,
            userId: decoded.userId
          });
          return res.status(403).json({
            success: false,
            message: 'Su cuenta de médico está deshabilitada.',
            code: 'MEDICO_DISABLED'
          });
        }
        
        req.user.medico = {
          id: medico.id,
          nombres: medico.nombres,
          apellidos: medico.apellidos,
          especialidad: medico.especialidad,
          registro_medico: medico.registro_medico
        };
        break;
      }

      case 'PACIENTE': {
        const paciente = await Paciente.findOne({ 
          where: { usuario_id: decoded.userId },
          attributes: ['id', 'nombres', 'apellidos', 'numero_identificacion', 'tipo_sangre', 'genero', 'fecha_nacimiento']
        });
        
        if (!paciente) {
          logger.error('PACIENTE_NOT_FOUND', {
            userId: decoded.userId,
            email: decoded.email
          });
          return res.status(403).json({
            success: false,
            message: 'Perfil de paciente no encontrado. Contacte al administrador.',
            code: 'PACIENTE_NOT_FOUND'
          });
        }
        
        req.user.paciente = {
          id: paciente.id,
          nombres: paciente.nombres,
          apellidos: paciente.apellidos,
          numero_identificacion: paciente.numero_identificacion,
          tipo_sangre: paciente.tipo_sangre,
          genero: paciente.genero,
          fecha_nacimiento: paciente.fecha_nacimiento
        };
        break;
      }

      case 'DIRECTOR_MEDICO': {
        // Director médico no requiere carga adicional, solo validar que el usuario exista
        const usuario = await Usuario.findOne({
          where: { id: decoded.userId },
          attributes: ['id', 'activo']
        });

        if (!usuario) {
          logger.error('DIRECTOR_NOT_FOUND', {
            userId: decoded.userId,
            email: decoded.email
          });
          return res.status(403).json({
            success: false,
            message: 'Usuario no encontrado.',
            code: 'USER_NOT_FOUND'
          });
        }

        if (!usuario.activo) {
          logger.security('DIRECTOR_DISABLED_ACCESS', {
            userId: decoded.userId
          });
          return res.status(403).json({
            success: false,
            message: 'Su cuenta está deshabilitada.',
            code: 'USER_DISABLED'
          });
        }
        break;
      }

      default: {
        logger.security('UNKNOWN_ROLE', {
          userId: decoded.userId,
          rol: decoded.rol
        });
        return res.status(403).json({
          success: false,
          message: 'Rol de usuario no reconocido.',
          code: 'UNKNOWN_ROLE'
        });
      }
    }

    req.app.locals.currentUserId = decoded.userId;
    next();

  } catch (error) {
    logger.security('AUTHENTICATION_FAILED', {
      error: error.message,
      code: error.code,
      ip: req.ip
    });

    return res.status(401).json({
      success: false,
      message: error.message,
      code: error.code || 'AUTHENTICATION_FAILED'
    });
  }
};

/**
 * Middleware para verificar roles
 * Uso: checkRole('MEDICO', 'DIRECTOR_MEDICO')
 */
export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
        code: 'NOT_AUTHENTICATED'
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
        message: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

/**
 * Middleware de autenticación opcional
 * Intenta autenticar pero no falla si no hay token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        rol: decoded.rol
      };

      // Cargar entidad según el rol (simplificado para optional)
      if (decoded.rol === 'MEDICO') {
        const medico = await Medico.findOne({ 
          where: { usuario_id: decoded.userId },
          attributes: ['id']
        });
        if (medico) {
          req.user.medico = { id: medico.id };
        }
      } else if (decoded.rol === 'PACIENTE') {
        const paciente = await Paciente.findOne({ 
          where: { usuario_id: decoded.userId },
          attributes: ['id']
        });
        if (paciente) {
          req.user.paciente = { id: paciente.id };
        }
      }
    }
  } catch (error) {
    // Ignorar errores en auth opcional
    logger.debug('Optional auth failed', { error: error.message });
  }
  next();
};

/**
 * Middleware específico para verificar solo rol MEDICO
 * Simplifica el uso en rutas médicas
 */
export const requireMedico = [authMiddleware, checkRole('MEDICO')];

/**
 * Middleware específico para verificar solo rol PACIENTE
 * Simplifica el uso en rutas de pacientes
 */
export const requirePaciente = [authMiddleware, checkRole('PACIENTE')];

/**
 * Middleware específico para verificar solo rol DIRECTOR_MEDICO
 * Simplifica el uso en rutas administrativas
 */
export const requireDirector = [authMiddleware, checkRole('DIRECTOR_MEDICO')];

/**
 * Middleware para rutas que pueden ser accedidas por MEDICO o DIRECTOR_MEDICO
 * Útil para reportes o estadísticas médicas
 */
export const requireMedicoOrDirector = [authMiddleware, checkRole('MEDICO', 'DIRECTOR_MEDICO')];

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  authMiddleware,
  checkRole,
  optionalAuth,
  requireMedico,
  requirePaciente,
  requireDirector,
  requireMedicoOrDirector
};