import loginService from "../services/loginService.js";
import { setAuthCookies, clearAuthCookies } from "../middlewares/authMiddleware.js";

class LoginController {
  /**
   * Login con cookies
   */
  async login(req, res) {
    try {
      const { email, password, rememberMe = false } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          success: false,
          message: "Email y contraseña son obligatorios" 
        });
      }

      const result = await loginService.login(email, password, rememberMe);

      // Configurar cookies
      setAuthCookies(res, result.accessToken, result.refreshToken, rememberMe);

      // Enviar respuesta sin tokens en body (están en cookies)
      res.status(200).json({
        success: true,
        message: result.message,
        usuario: result.usuario
      });

    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || "Error al iniciar sesión"
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
          message: "Refresh token no proporcionado"
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
      // Si el refresh token expiró, limpiar cookies
      clearAuthCookies(res);
      
      res.status(error.status || 401).json({
        success: false,
        message: error.message || "Error al refrescar token"
      });
    }
  }

  /**
   * Logout
   */
  async logout(req, res) {
    try {
      const userId = req.user?.userId;

      if (userId) {
        await loginService.logout(userId);
      }

      // Limpiar cookies
      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: "Sesión cerrada correctamente"
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Error al cerrar sesión"
      });
    }
  }

  /**
   * Me
   */
  async me(req, res) {
  try {
    // El middleware de autenticación ya coloca req.user
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "No autenticado"
      });
    }

    const { userId } = req.user;

    // Busca el usuario y sus datos relacionados
    const usuario = await Usuario.findByPk(userId, {
      attributes: ['id', 'email', 'rol'], // solo lo necesario
      include: [
        {
          model: Paciente,
          as: 'paciente',
          attributes: [
            'id',
            'nombre',
            'apellido',
            'fecha_nacimiento',
            'telefono',
            'genero',
            'tipo_documento',
            'numero_documento'
          ],
          include: [
            {
              model: Direccion,
              as: 'direcciones',
              attributes: [
                'id',
                'calle',
                'ciudad',
                'departamento',
                'codigo_postal',
                'pais'
              ]
            }
          ]
        }
      ]
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    res.status(200).json({
      success: true,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol.toLowerCase(),
        datos_personales: usuario.paciente || null
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Error al obtener datos del usuario"
    });
  }
  }
}

export default new LoginController();