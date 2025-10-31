// src/middlewares/authMiddleware.js
// Middleware de autenticación (CommonJS)
const authMiddleware = (req, res, next) => {
  try {
    // En un caso real validarías un token o sesión
    // Aquí simulamos que el paciente fue aprobado a través del header
    const pacienteId = req.headers['x-paciente-id']; // Lo envías desde Postman

    if (!pacienteId) {
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