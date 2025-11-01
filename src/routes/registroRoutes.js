import express from 'express';
import registroController from '../controllers/registroController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { checkRole } from '../middlewares/rbacMiddleware.js';
import rateLimiter from '../middlewares/rateLimiter.js';
import {
  validate,
  registroPacienteSchema,
  registroMedicoSchema,
  decisionSolicitudSchema
} from '../validators/registroValidator.js';

const router = express.Router();

/**
 * @swagger
 * /registro/paciente:
 *   post:
 *     summary: Registro de un nuevo paciente
 *     description: Permite registrar un paciente en el sistema. Esta ruta es pública y no requiere autenticación.
 *     tags:
 *       - Registro
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - documento
 *               - correo
 *               - telefono
 *               - clave
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Carlos"
 *               apellido:
 *                 type: string
 *                 example: "Gómez"
 *               documento:
 *                 type: string
 *                 example: "1020304050"
 *               correo:
 *                 type: string
 *                 example: "carlos.gomez@example.com"
 *               telefono:
 *                 type: string
 *                 example: "+57 3104567890"
 *               clave:
 *                 type: string
 *                 example: "ClaveSegura123!"
 *     responses:
 *       201:
 *         description: Paciente registrado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Paciente registrado exitosamente."
 *                 paciente:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64fcbb23d4f9e91a2f5a1d2c"
 *                     nombre:
 *                       type: string
 *                       example: "Carlos Gómez"
 *                     correo:
 *                       type: string
 *                       example: "carlos.gomez@example.com"
 *       400:
 *         description: Datos inválidos o campos requeridos faltantes.
 *       429:
 *         description: Límite de solicitudes excedido (rate limit alcanzado).
 *       500:
 *         description: Error interno del servidor.
 */

router.post(
  '/paciente',
   rateLimiter.rateLimit.global,
  validate(registroPacienteSchema),
  registroController.registrarPaciente
);

/**
 * @swagger
 * /registro/medico:
 *   post:
 *     summary: Registro de un nuevo médico
 *     description: >
 *       Permite registrar un médico en el sistema.  
 *       Esta ruta es privada y requiere permisos de **ADMIN** o **DIRECTOR_MEDICO**.
 *     tags:
 *       - Registro
 *     security:
 *       - bearerAuth: []   # Solo si usas autenticación JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - documento
 *               - correo
 *               - telefono
 *               - clave
 *               - especialidad
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Laura"
 *               apellido:
 *                 type: string
 *                 example: "Martínez"
 *               documento:
 *                 type: string
 *                 example: "9988776655"
 *               correo:
 *                 type: string
 *                 example: "laura.martinez@clinic.com"
 *               telefono:
 *                 type: string
 *                 example: "+57 3209876543"
 *               clave:
 *                 type: string
 *                 example: "Doctor123!"
 *               especialidad:
 *                 type: string
 *                 example: "Cardiología"
 *     responses:
 *       201:
 *         description: Médico registrado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                   example: "Médico registrado exitosamente."
 *                 medico:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64fcbb23d4f9e91a2f5a1d2d"
 *                     nombre:
 *                       type: string
 *                       example: "Laura Martínez"
 *                     especialidad:
 *                       type: string
 *                       example: "Cardiología"
 *       400:
 *         description: Datos inválidos o campos requeridos faltantes.
 *       401:
 *         description: No autorizado. Se requiere token JWT válido.
 *       403:
 *         description: Permisos insuficientes (solo ADMIN o DIRECTOR_MEDICO pueden registrar médicos).
 *       500:
 *         description: Error interno del servidor.
 */

router.post(
  '/medico',
  authMiddleware,
  checkRole('ADMIN', 'DIRECTOR_MEDICO'),
  validate(registroMedicoSchema),
  registroController.registrarMedico
);

/**
 * @route   GET /api/v1/solicitudes
 * @desc    Listar solicitudes de registro (HU-02)
 * @access  Private (DIRECTOR_MEDICO)
 */
router.get(
  '/solicitudes',
  authMiddleware,
  checkRole('DIRECTOR_MEDICO'),
  registroController.listarSolicitudes
);

/**
 * @route   PATCH /api/v1/solicitudes/:id/aprobar
 * @desc    Aprobar solicitud (HU-03)
 * @access  Private (DIRECTOR_MEDICO)
 */
router.patch(
  '/solicitudes/:id/aprobar',
  authMiddleware,
  checkRole('DIRECTOR_MEDICO'),
  registroController.aprobarSolicitud
);

/**
 * @route   PATCH /api/v1/solicitudes/:id/rechazar
 * @desc    Rechazar solicitud (HU-03)
 * @access  Private (DIRECTOR_MEDICO)
 */
router.patch(
  '/solicitudes/:id/rechazar',
  authMiddleware,
  checkRole('DIRECTOR_MEDICO'),
  validate(decisionSolicitudSchema),
  registroController.rechazarSolicitud
);

export default router;