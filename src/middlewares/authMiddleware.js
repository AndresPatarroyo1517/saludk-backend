import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

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
      err.code = 'TOKEN_EXPIRED'; // ✅ Agregar código
      throw err;
    }
    const err = new Error('Token inválido');
    err.code = 'INVALID_TOKEN'; // ✅ Agregar código
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
      err.code = 'REFRESH_TOKEN_EXPIRED'; // ✅ Agregar código
      throw err;
    }
    const err = new Error('Refresh token inválido');
    err.code = 'INVALID_REFRESH_TOKEN'; // ✅ Agregar código
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
    sameSite: 'strict', // ✅ CAMBIO: 'lax' -> 'strict' para mayor seguridad
    maxAge: accessTokenMaxAge
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // ✅ CAMBIO: 'lax' -> 'strict'
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
 * Middleware de autenticación - MEJORADO
 */
export const authMiddleware = (req, res, next) => {
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
        message: 'Token no proporcionado', // ✅ Cambio: 'error' -> 'message'
        code: 'MISSING_TOKEN' // ✅ Agregar código
      });
    }

    const decoded = verifyAccessToken(token);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      rol: decoded.rol
    };

    req.app.locals.currentUserId = decoded.userId;
    next();

  } catch (error) {
    logger.security('AUTHENTICATION_FAILED', {
      error: error.message,
      code: error.code, // ✅ Agregar código al log
      ip: req.ip
    });

    // ✅ Respuesta consistente con el controller
    return res.status(401).json({
      success: false,
      message: error.message,
      code: error.code || 'AUTHENTICATION_FAILED'
    });
  }
};

/**
 * Middleware para verificar roles
 */
export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado', // ✅ Cambio: 'error' -> 'message'
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
        message: 'No tiene permisos para acceder a este recurso', // ✅ Cambio
        code: 'INSUFFICIENT_PERMISSIONS' // ✅ Agregar código
      });
    }

    next();
  };
};

/**
 * Middleware de autenticación opcional
 */
export const optionalAuth = (req, res, next) => {
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
    }
  } catch (error) {
    // Ignorar errores en auth opcional
  }
  next();
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  authMiddleware,
  checkRole,
  optionalAuth
};