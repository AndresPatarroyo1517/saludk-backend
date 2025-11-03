import express from 'express';
import multer from 'multer';
import registroController from '../controllers/registroController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import rateLimiter from '../middlewares/rateLimiter.js';
import {
  validate,
  registroPacienteSchema,
  registroMedicoSchema,
  decisionSolicitudSchema
} from '../validators/registroValidator.js';

const router = express.Router();

// Configurar multer para archivos temporales
const upload = multer({ 
  dest: 'uploads/temp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo PDF, JPG, PNG'));
    }
  }
});

/**
 * @route   POST /api/v1/registro/paciente
 * @desc    Registro de un nuevo paciente
 * @access  Public
 */
router.post(
  '/paciente',
  rateLimiter.rateLimit.global,
  validate(registroPacienteSchema),
  registroController.registrarPaciente
);

/**
 * @route   POST /api/v1/registro/solicitudes/:id/documentos
 * @desc    Subir documento a una solicitud PENDIENTE
 * @access  Public (el usuario que creó la solicitud)
 */
router.post(
  '/solicitudes/:id/documentos',
  rateLimiter.rateLimit.upload || rateLimiter.rateLimit.global,
  upload.single('documento'), // Campo 'documento' en FormData
  registroController.subirDocumento
);

/**
 * @route   GET /api/v1/registro/solicitudes/:id/documentos
 * @desc    Listar documentos de una solicitud
 * @access  Private (DIRECTOR_MEDICO) o Public (dueño de la solicitud)
 */
router.get(
  '/solicitudes/:id/documentos',
  registroController.listarDocumentos
);

/**
 * @route   POST /api/v1/registro/medico
 * @desc    Registro de un nuevo médico
 * @access  Private (ADMIN o DIRECTOR_MEDICO)
 */
router.post(
  '/medico',
  authMiddleware,
  validate(registroMedicoSchema),
  registroController.registrarMedico
);

/**
 * @route   GET /api/v1/registro/solicitudes
 * @desc    Listar solicitudes de registro (HU-02)
 * @access  Private (DIRECTOR_MEDICO)
 */
router.get(
  '/solicitudes',
  authMiddleware,
  registroController.listarSolicitudes
);

/**
 * @route   PATCH /api/v1/registro/solicitudes/:id/aprobar
 * @desc    Aprobar solicitud (HU-03)
 * @access  Private (DIRECTOR_MEDICO)
 */
router.patch(
  '/solicitudes/:id/aprobar',
  authMiddleware,
  registroController.aprobarSolicitud
);

/**
 * @route   PATCH /api/v1/registro/solicitudes/:id/rechazar
 * @desc    Rechazar solicitud (HU-03)
 * @access  Private (DIRECTOR_MEDICO)
 */
router.patch(
  '/solicitudes/:id/rechazar',
  authMiddleware,
  validate(decisionSolicitudSchema),
  registroController.rechazarSolicitud
);

export default router;