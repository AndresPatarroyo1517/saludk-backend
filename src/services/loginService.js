import { Usuario } from "../models/index.js";
import bcrypt from "bcrypt";
import logger from "../utils/logger.js";
import { 
  generateAccessToken, 
  generateRefreshToken 
} from "../middlewares/authMiddleware.js";

class LoginService {
  /**
   * Iniciar sesión con email, password y opción de recordar
   */
  async login(email, password, rememberMe = false) {
    try {
      // Buscar usuario
      const usuario = await Usuario.findOne({ where: { email } });
      if (!usuario) {
        const e = new Error("No existe el usuario registrado en la plataforma");
        e.status = 401;
        throw e;
      }

      // Verificar si está activo
      if (!usuario.activo) {
        const e = new Error("La cuenta no está activa. Contacte al administrador.");
        e.status = 403;
        throw e;
      }

      // Verificar contraseña
      const passwordValida = await bcrypt.compare(password, usuario.password_hash);
      if (!passwordValida) {
        const e = new Error("Credenciales inválidas");
        e.status = 401;
        throw e;
      }

      // Payload para tokens
      const payload = {
        userId: usuario.id,
        email: usuario.email,
        rol: usuario.rol
      };

      // Generar tokens
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload, rememberMe);

      // Actualizar último acceso
      usuario.ultimo_acceso = new Date();
      await usuario.save();

      logger.info(`Usuario ${usuario.email} inició sesión correctamente (rememberMe: ${rememberMe})`);

      return {
        success: true,
        message: "Inicio de sesión exitoso",
        accessToken,
        refreshToken,
        rememberMe,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol,
          activo: usuario.activo,
          ultimo_acceso: usuario.ultimo_acceso
        }
      };
    } catch (error) {
      logger.error(`Error en login: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refrescar access token usando refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const { verifyRefreshToken } = await import("../middlewares/authMiddleware.js");
      
      // Verificar refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Buscar usuario para verificar que sigue activo
      const usuario = await Usuario.findByPk(decoded.userId);
      
      if (!usuario || !usuario.activo) {
        const e = new Error("Usuario no válido o inactivo");
        e.status = 403;
        throw e;
      }

      // Generar nuevo access token
      const payload = {
        userId: usuario.id,
        email: usuario.email,
        rol: usuario.rol
      };

      const newAccessToken = generateAccessToken(payload);

      logger.info(`Token refrescado para usuario ${usuario.email}`);

      return {
        success: true,
        accessToken: newAccessToken,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol
        }
      };
    } catch (error) {
      logger.error(`Error al refrescar token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cerrar sesión (invalidar tokens en el cliente)
   */
  async logout(userId) {
    try {
      logger.info(`Usuario ${userId} cerró sesión`);
      return {
        success: true,
        message: "Sesión cerrada correctamente"
      };
    } catch (error) {
      logger.error(`Error en logout: ${error.message}`);
      throw error;
    }
  }
}

export default new LoginService();