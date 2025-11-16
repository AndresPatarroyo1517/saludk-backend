import loginService from "../services/loginService.js";
import { setAuthCookies, clearAuthCookies } from "../middlewares/authMiddleware.js";
import { Usuario, Paciente, Direccion } from "../models/index.js";
import userService from "../services/userService.js";

class LoginController {
  /**
   * Login con cookies
   */
  async login(req, res) {
    try {
      const { email, password, rememberMe = false } = req.body;

      // Validación mejorada
      if (!email || !password) {
        return res.status(400).json({ 
          success: false,
          message: "Email y contraseña son obligatorios",
          code: "MISSING_CREDENTIALS"
        });
      }

      // Validación de formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Formato de email inválido",
          code: "INVALID_EMAIL"
        });
      }

      const result = await loginService.login(email, password, rememberMe);

      // Configurar cookies
      setAuthCookies(res, result.accessToken, result.refreshToken, rememberMe);

      // Log de auditoría (importante para seguridad)
      console.log(`[LOGIN SUCCESS] User: ${result.usuario.email} | IP: ${req.ip}`);

      // Enviar respuesta sin tokens en body
      res.status(200).json({
        success: true,
        message: result.message,
        usuario: result.usuario
      });

    } catch (error) {
      // Log de auditoría de fallos
      console.error(`[LOGIN FAILED] Email: ${req.body?.email} | IP: ${req.ip} | Error: ${error.message}`);
      
      // Mapeo seguro de errores (no exponer internals)
      const statusCode = error.status || 500;
      const safeMessage = this._getSafeErrorMessage(error);
      
      res.status(statusCode).json({
        success: false,
        message: safeMessage,
        code: error.code || "LOGIN_ERROR"
      });
    }
  }

  /**
   * Refresh token
   */
  async refresh(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: "Refresh token no proporcionado",
          code: "MISSING_REFRESH_TOKEN"
        });
      }

      const result = await loginService.refreshAccessToken(refreshToken);

      // Actualizar solo el access token en cookies
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutos
      });

      res.status(200).json({
        success: true,
        message: "Token refrescado correctamente",
        usuario: result.usuario
      });

    } catch (error) {
      // Limpiar cookies si refresh falla
      clearAuthCookies(res);
      
      console.error(`[REFRESH FAILED] IP: ${req.ip} | Error: ${error.message}`);
      
      res.status(error.status || 401).json({
        success: false,
        message: error.message || "Sesión expirada",
        code: error.code || "REFRESH_FAILED"
      });
    }
  }

  /**
   * Logout - CORREGIDO
   */
  async logout(req, res) {
    try {
      const userId = req.user?.userId;
      const refreshToken = req.cookies?.refreshToken;

      // Intentar invalidar en base de datos
      if (userId && refreshToken) {
        await loginService.logout(userId, refreshToken);
        console.log(`[LOGOUT SUCCESS] User ID: ${userId} | IP: ${req.ip}`);
      } else if (refreshToken) {
        // Si no hay userId pero sí refreshToken, invalidarlo de todos modos
        await loginService.invalidateRefreshToken(refreshToken);
        console.log(`[LOGOUT SUCCESS] Token invalidated | IP: ${req.ip}`);
      }

      // SIEMPRE limpiar cookies, incluso si falla la invalidación en BD
      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: "Sesión cerrada correctamente"
      });

    } catch (error) {
      console.error(`[LOGOUT ERROR] IP: ${req.ip} | Error: ${error.message}`);
      
      // IMPORTANTE: Incluso si hay error, limpiar cookies
      clearAuthCookies(res);
      
      // No devolver 500, logout siempre "funciona" del lado del cliente
      res.status(200).json({
        success: true,
        message: "Sesión cerrada correctamente"
      });
    }
  }

  /**
   * Me - OPTIMIZADO
   */
  async me(req, res) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({
          success: false,
          message: "No autenticado",
          code: "NOT_AUTHENTICATED"
        });
      }

      const { userId } = req.user;
      
      const result = await userService.getUserProfile(userId);

      return res.status(200).json(result);

    } catch (error) {
      console.error(`[ME ERROR] User: ${req.user?.userId} | Error:`, error);

      const status = error.status || 500;
      const code = error.code || "INTERNAL_ERROR";

      return res.status(status).json({
        success: false,
        message: error.message || "Error al obtener datos del usuario",
        code
      });
    }
  }

  /**
   * Mapeo seguro de errores (no exponer detalles internos)
   */
  _getSafeErrorMessage(error) {
    // Errores conocidos y seguros de exponer
    const safeErrors = [
      'Credenciales incorrectas',
      'Usuario no encontrado',
      'Cuenta inactiva',
      'Email ya registrado',
      'Contraseña incorrecta'
    ];

    if (safeErrors.includes(error.message)) {
      return error.message;
    }

    // Para cualquier otro error, mensaje genérico
    return "Error al iniciar sesión. Intenta nuevamente.";
  }
}

export default new LoginController();