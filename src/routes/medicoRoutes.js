import express from 'express';
import MedicoController from '../controllers/medicoController.js';
import { requireMedico } from '../middlewares/authMiddleware.js';

const router = express.Router();
const controller = new MedicoController();

/**
 * @swagger
 * tags:
 *   name: Médicos
 *   description: Gestión de médicos y disponibilidad
 */

// ==================== RUTAS PÚBLICAS ====================

/**
 * @swagger
 * /medicos:
 *   get:
 *     summary: Listar médicos disponibles (PÚBLICO)
 *     description: Obtiene lista de médicos con filtros. No requiere autenticación.
 *     tags: [Médicos]
 *     parameters:
 *       - in: query
 *         name: especialidad
 *         schema:
 *           type: string
 *       - in: query
 *         name: localidad
 *         schema:
 *           type: string
 *       - in: query
 *         name: modalidad
 *         schema:
 *           type: string
 *           enum: [PRESENCIAL, VIRTUAL]
 *       - in: query
 *         name: calificacion_minima
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Lista de médicos obtenida exitosamente
 */
router.get('/', controller.listarMedicos);

/**
 * @swagger
 * /medicos/{medicoId}:
 *   get:
 *     summary: Obtener detalle de un médico (PÚBLICO)
 *     description: Información detallada del médico. No requiere autenticación.
 *     tags: [Médicos]
 *     parameters:
 *       - in: path
 *         name: medicoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Detalle del médico obtenido
 *       404:
 *         description: Médico no encontrado
 */
router.get('/:medicoId', controller.obtenerDetalle);

/**
 * @swagger
 * /medicos/{medicoId}/disponibilidad-consulta:
 *   get:
 *     summary: Consultar disponibilidad configurada del médico (PÚBLICO)
 *     tags: [Médicos]
 *     parameters:
 *       - in: path
 *         name: medicoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Disponibilidad obtenida
 */
router.get('/:medicoId/disponibilidad-consulta', controller.obtenerDisponibilidad);

// ==================== RUTAS PROTEGIDAS (Solo Médicos) ====================

/**
 * @swagger
 * /medicos/mi-perfil:
 *   get:
 *     summary: Obtener perfil del médico autenticado
 *     tags: [Médicos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del médico
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es médico
 */
router.get('/mi-perfil', requireMedico, (req, res) => {
  req.params.medicoId = req.user.medico.id;
  return controller.obtenerDetalle(req, res);
});

/**
 * @swagger
 * /medicos/mi-disponibilidad:
 *   post:
 *     summary: Configurar disponibilidad horaria (SOLO MÉDICO AUTENTICADO)
 *     description: Permite al médico autenticado configurar sus horarios de disponibilidad
 *     tags: [Médicos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - disponibilidades
 *             properties:
 *               disponibilidades:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - dia_semana
 *                     - hora_inicio
 *                     - hora_fin
 *                     - modalidad
 *                   properties:
 *                     dia_semana:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *                     hora_inicio:
 *                       type: string
 *                       pattern: '^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$'
 *                     hora_fin:
 *                       type: string
 *                       pattern: '^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$'
 *                     modalidad:
 *                       type: string
 *                       enum: [PRESENCIAL, VIRTUAL]
 *     responses:
 *       201:
 *         description: Disponibilidad configurada exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es médico
 */
router.post('/mi-disponibilidad', requireMedico, (req, res) => {
  req.params.medicoId = req.user.medico.id;
  return controller.configurarDisponibilidad(req, res);
});

/**
 * @swagger
 * /medicos/mi-disponibilidad:
 *   get:
 *     summary: Obtener mi disponibilidad configurada (SOLO MÉDICO AUTENTICADO)
 *     tags: [Médicos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disponibilidad obtenida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es médico
 */
router.get('/mi-disponibilidad', requireMedico, (req, res) => {
  req.params.medicoId = req.user.medico.id;
  return controller.obtenerDisponibilidad(req, res);
});

/**
 * @swagger
 * /medicos/mi-perfil/actualizar:
 *   put:
 *     summary: Actualizar datos del perfil del médico autenticado
 *     tags: [Médicos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               telefono:
 *                 type: string
 *               localidad:
 *                 type: string
 *               costo_consulta_presencial:
 *                 type: number
 *               costo_consulta_virtual:
 *                 type: number
 *               disponible:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es médico
 */
router.put('/mi-perfil/actualizar', requireMedico, (req, res) => {
  req.params.medicoId = req.user.medico.id;
  return controller.actualizarPerfil(req, res);
});

export default router;