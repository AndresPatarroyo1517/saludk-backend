// src/middlewares/authMiddleware.js
// Middleware de autenticación (CommonJS)
const authMiddleware = (req, res, next) => {
  try {
    // En un caso real validarías un token o sesión
    // Aquí simulamos que el paciente fue aprobado a través del header
    const pacienteId = req.headers['x-paciente-id']; // Lo envías desde Postman

    if (!pacienteId) {
      // En desarrollo permitimos un ID simulado para facilitar pruebas desde Swagger UI
      if (process.env.NODE_ENV === 'development') {
        const devId = process.env.DEV_PACIENTE_ID || 'dev-paciente-id';
        req.pacienteId = devId;
        console.warn('authMiddleware: usando pacienteId de desarrollo ->', devId);
        return next();
      }

      return res.status(401).json({ message: 'Paciente no autenticado.' });
    }

    req.pacienteId = pacienteId;
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error en autenticación.' });
  }
};

module.exports = { authMiddleware };