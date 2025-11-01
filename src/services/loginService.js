import { Usuario } from "../models/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

class LoginService {
  /**
   * Iniciar sesión de usuario con email y contraseña
   */
  async login(email, password) {
    try {
      // Buscar usuario por email
      const usuario = await Usuario.findOne({ where: { email } });
      if (!usuario) {
        const e = new Error("Credenciales inválidas");
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

      // Generar token JWT
      const token = jwt.sign(
        {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol,
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "8h" }
      );

      // Actualizar último acceso
      usuario.ultimo_acceso = new Date();
      await usuario.save();

      logger.info(`Usuario ${usuario.email} inició sesión correctamente`);

      return {
        message: "Inicio de sesión exitoso",
        token,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          rol: usuario.rol,
          activo: usuario.activo,
          ultimo_acceso: usuario.ultimo_acceso,
        },
      };
    } catch (error) {
      logger.error(`Error en login: ${error.message}`);
      throw error;
    }
  }
}

export default new LoginService();
