import express from 'express';
import CitaController from '../controllers/citasController.js';
import { requirePaciente, requireMedico, authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();
const controller = new CitaController();

/**
 * @swagger
 * tags:
 *   name: Citas
 *   description: Gestión de citas médicas
 */

// ==================== RUTAS PÚBLICAS (Consulta de disponibilidad) ====================

/**
 * @swagger
 * /citas/disponibilidad/{medicoId}:
 *   get:
 *     summary: Obtener disponibilidad de un médico (PÚBLICO)
 *     description: Retorna slots disponibles y ocupados. No requiere autenticación.
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: medicoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: fecha_inicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fecha_fin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Disponibilidad obtenida exitosamente
 */
router.get('/disponibilidad/:medicoId', controller.obtenerDisponibilidad);

/**
 * @swagger
 * /citas/disponibilidad/{medicoId}/validar:
 *   post:
 *     summary: Validar disponibilidad de un slot específico (PÚBLICO)
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: medicoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fecha_hora
 *             properties:
 *               fecha_hora:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Validación realizada
 */
router.post('/disponibilidad/:medicoId/validar', controller.validarSlot);

/**
 * @swagger
 * /citas/disponibilidad/{medicoId}/proximos-slots:
 *   get:
 *     summary: Obtener próximos slots disponibles (PÚBLICO)
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: medicoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: cantidad
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Próximos slots obtenidos
 */
router.get('/disponibilidad/:medicoId/proximos-slots', controller.obtenerProximosSlots);

// ==================== RUTAS PROTEGIDAS (Pacientes) ====================

/**
 * @swagger
 * /citas:
 *   post:
 *     summary: Crear una nueva cita (SOLO PACIENTES)
 *     description: Crea una cita para el paciente autenticado
 *     tags: [Citas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - medico_id
 *               - fecha_hora
 *               - modalidad
 *             properties:
 *               medico_id:
 *                 type: string
 *                 format: uuid
 *               fecha_hora:
 *                 type: string
 *                 format: date-time
 *               modalidad:
 *                 type: string
 *                 enum: [PRESENCIAL, VIRTUAL]
 *               motivo_consulta:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cita creada exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente
 */
router.post('/', requirePaciente, (req, res) => {
  // El paciente_id viene de req.user.paciente.id
  req.body.paciente_id = req.user.paciente.id;
  return controller.crearCita(req, res);
});

/**
 * @swagger
 * /citas/mis-citas:
 *   get:
 *     summary: Obtener citas del paciente autenticado
 *     tags: [Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [AGENDADA, CONFIRMADA, COMPLETADA, CANCELADA]
 *     responses:
 *       200:
 *         description: Citas obtenidas exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente
 */
router.get('/mis-citas', requirePaciente, (req, res) => {
  req.params.pacienteId = req.user.paciente.id;
  return controller.obtenerCitasPaciente(req, res);
});

/**
 * @swagger
 * /citas/{citaId}:
 *   put:
 *     summary: Editar una cita (SOLO PACIENTE DUEÑO)
 *     tags: [Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: citaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fecha_hora:
 *                 type: string
 *                 format: date-time
 *               modalidad:
 *                 type: string
 *                 enum: [PRESENCIAL, VIRTUAL]
 *               motivo_consulta:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cita actualizada exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (no es el paciente dueño)
 */
router.put('/:citaId', requirePaciente, controller.editarCita);

/**
 * @swagger
 * /citas/{citaId}/cancelar:
 *   delete:
 *     summary: Cancelar una cita (SOLO PACIENTE DUEÑO)
 *     tags: [Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: citaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo_cancelacion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cita cancelada exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.delete('/:citaId/cancelar', requirePaciente, controller.cancelarCita);

// ==================== RUTAS PROTEGIDAS (Médicos) ====================

/**
 * @swagger
 * /citas/medico/mis-citas:
 *   get:
 *     summary: Obtener citas del médico autenticado
 *     tags: [Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *       - in: query
 *         name: fecha_desde
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Citas del médico obtenidas
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es médico
 */
router.get('/medico/mis-citas', requireMedico, (req, res) => {
  req.params.medicoId = req.user.medico.id;
  return controller.obtenerCitasMedico(req, res);
});

export default router;