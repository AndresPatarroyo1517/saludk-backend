import express from 'express';
import { revisar } from '../controllers/validacion.controller.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @route   POST /validacion/solicitudes/:id/revisar
 * @desc    Revisión automática de riesgos (HU-04): consulta bases externas
 *          y actualiza la solicitud a APROBADA o RECHAZADA según fraude.
 *          Si falla la consulta, mantiene PENDIENTE y permite revisión manual.
 * @access  Private (recomendado: Director Médico / Admin)
 * @param   id (path) - UUID de solicitud_registro
 */
router.post('/solicitudes/:id/revisar',authenticateToken,revisar);

export default router;