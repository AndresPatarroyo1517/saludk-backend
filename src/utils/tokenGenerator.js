import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const jwtConfig = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenExpiry: '15m',    // 15 minutos
  refreshTokenExpiry: '7d',    // 7 días
  issuer: 'saludK-backend',
  audience: 'saludK-app',
};

/**
 * Genera un Access Token (JWT de corta duración)
 * @param {object} payload - Datos del usuario (id, rol, email)
 * @returns {string} Access Token
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
    {
      expiresIn: jwtConfig.accessTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      jwtid: uuidv4()
    }
  );
};

/**
 * Genera un Refresh Token (JWT de larga duración)
 * @param {object} payload - Datos del usuario (id, email)
 * @returns {string} Refresh Token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      type: 'refresh'
    },
    jwtConfig.refreshTokenSecret,
    {
      expiresIn: jwtConfig.refreshTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      jwtid: uuidv4()
    }
  );
};

/**
 * Verifica un Access Token
 * @param {string} token - Token a verificar
 * @returns {object} Payload decodificado
 * @throws {Error} Si el token es inválido
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.accessTokenSecret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    }
    throw error;
  }
};

/**
 * Verifica un Refresh Token
 * @param {string} token - Token a verificar
 * @returns {object} Payload decodificado
 * @throws {Error} Si el token es inválido
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.refreshTokenSecret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Refresh token inválido');
    }
    throw error;
  }
};

/**
 * Decodifica un token sin verificar (útil para debugging)
 * @param {string} token - Token a decodificar
 * @returns {object} Payload decodificado
 */
export const decodeToken = (token) => {
  return jwt.decode(token, { complete: true });
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken
};