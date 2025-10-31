import express from 'express';
import { 
  registrarPacienteController, 
  registrarMedicoController 
} from '../controllers/registroController.js';
import { authenticateToken } from '../middlewares/auth.js'; // Middleware de autenticación

const router = express.Router();

/**
 * @route   POST /register/paciente
 * @desc    Registro de paciente (público - no requiere autenticación)
 * @access  Public
 * @body    { usuario: { email, password }, paciente: { nombres, apellidos, ... } }
 */
router.post('/paciente', registrarPacienteController);

/**
 * @route   POST /register/medico
 * @desc    Registro de médico (requiere autenticación como admin)
 * @access  Private (Admin only)
 * @body    { usuario: { email, password }, medico: { nombres, apellidos, ... } }
 */
router.post('/medico', authenticateToken, registrarMedicoController);

export default router;