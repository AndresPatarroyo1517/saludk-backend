import express from 'express';
import calificacionController from '../controllers/calificacionController.js';
import { requirePaciente, authMiddleware} from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Calificaciones Médicos
 *     description: Endpoints para gestionar calificaciones de médicos
 *   - name: Calificaciones Productos
 *     description: Endpoints para gestionar calificaciones de productos
 *   - name: Calificaciones Generales
 *     description: Endpoints generales de calificaciones
 */

// ==================== RUTAS DE CALIFICACIONES DE MÉDICOS ====================

/**
 * @swagger
 * /calificaciones/medicos:
 *   post:
 *     summary: Crear una calificación para un médico (solo pacientes)
 *     tags: [Calificaciones Médicos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - medicoId
 *               - citaId
 *               - puntuacion
 *             properties:
 *               medicoId:
 *                 type: string
 *                 format: uuid
 *               citaId:
 *                 type: string
 *                 format: uuid
 *               puntuacion:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comentario:
 *                 type: string
 *     responses:
 *       201:
 *         description: Calificación creada exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente
 */
router.post('/medicos', requirePaciente, (req, res) => {
  // El pacienteId viene de req.user.paciente.id
  req.body.pacienteId = req.user.paciente.id;
  return calificacionController.crearCalificacionMedico(req, res);
});

/**
 * @swagger
 * /calificaciones/medicos/{id}:
 *   get:
 *     summary: Obtener una calificación de médico por ID (público)
 *     tags: [Calificaciones Médicos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Calificación encontrada
 *       404:
 *         description: Calificación no encontrada
 */
router.get('/medicos/:id', calificacionController.obtenerCalificacionMedicoPorId);

/**
 * @swagger
 * /calificaciones/medicos/{id}:
 *   put:
 *     summary: Actualizar una calificación de médico (solo el paciente que la creó)
 *     tags: [Calificaciones Médicos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               puntuacion:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comentario:
 *                 type: string
 *     responses:
 *       200:
 *         description: Calificación actualizada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (no es el paciente que creó la calificación)
 */
router.put('/medicos/:id', requirePaciente, (req, res) => {
  req.body.pacienteId = req.user.paciente.id;
  return calificacionController.actualizarCalificacionMedico(req, res);
});

/**
 * @swagger
 * /calificaciones/medicos/{id}:
 *   delete:
 *     summary: Eliminar una calificación de médico (solo el paciente que la creó)
 *     tags: [Calificaciones Médicos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Calificación eliminada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Calificación no encontrada
 */
router.delete('/medicos/:id', requirePaciente, (req, res) => {
  req.body.pacienteId = req.user.paciente.id;
  return calificacionController.eliminarCalificacionMedico(req, res);
});

/**
 * @swagger
 * /calificaciones/medicos/medico/{medicoId}:
 *   get:
 *     summary: Obtener todas las calificaciones de un médico (público)
 *     tags: [Calificaciones Médicos]
 *     parameters:
 *       - in: path
 *         name: medicoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: puntuacionMin
 *         schema:
 *           type: integer
 *       - in: query
 *         name: puntuacionMax
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Lista de calificaciones
 */
router.get('/medicos/medico/:medicoId', calificacionController.obtenerCalificacionesPorMedico);

/**
 * @swagger
 * /calificaciones/medicos/medico/{medicoId}/estadisticas:
 *   get:
 *     summary: Obtener estadísticas de calificaciones de un médico (público)
 *     tags: [Calificaciones Médicos]
 *     parameters:
 *       - in: path
 *         name: medicoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Estadísticas de calificaciones
 */
router.get('/medicos/medico/:medicoId/estadisticas', calificacionController.obtenerEstadisticasMedico);

// ==================== RUTAS DE CALIFICACIONES DE PRODUCTOS ====================

/**
 * @swagger
 * /calificaciones/productos:
 *   post:
 *     summary: Crear una calificación para un producto (solo pacientes)
 *     tags: [Calificaciones Productos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productoId
 *               - compraId
 *               - puntuacion
 *             properties:
 *               productoId:
 *                 type: string
 *                 format: uuid
 *               compraId:
 *                 type: string
 *                 format: uuid
 *               puntuacion:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comentario:
 *                 type: string
 *     responses:
 *       201:
 *         description: Calificación creada exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente
 */
router.post('/productos', requirePaciente, (req, res) => {
  req.body.pacienteId = req.user.paciente.id;
  return calificacionController.crearCalificacionProducto(req, res);
});

/**
 * @swagger
 * /calificaciones/productos/{id}:
 *   get:
 *     summary: Obtener una calificación de producto por ID (público)
 *     tags: [Calificaciones Productos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Calificación encontrada
 *       404:
 *         description: Calificación no encontrada
 */
router.get('/productos/:id', calificacionController.obtenerCalificacionProductoPorId);

/**
 * @swagger
 * /calificaciones/productos/{id}:
 *   put:
 *     summary: Actualizar una calificación de producto (solo el paciente que la creó)
 *     tags: [Calificaciones Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               puntuacion:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comentario:
 *                 type: string
 *     responses:
 *       200:
 *         description: Calificación actualizada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.put('/productos/:id', requirePaciente, (req, res) => {
  req.body.pacienteId = req.user.paciente.id;
  return calificacionController.actualizarCalificacionProducto(req, res);
});

/**
 * @swagger
 * /calificaciones/productos/{id}:
 *   delete:
 *     summary: Eliminar una calificación de producto (solo el paciente que la creó)
 *     tags: [Calificaciones Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Calificación eliminada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.delete('/productos/:id', requirePaciente, (req, res) => {
  req.body.pacienteId = req.user.paciente.id;
  return calificacionController.eliminarCalificacionProducto(req, res);
});

/**
 * @swagger
 * /calificaciones/productos/producto/{productoId}:
 *   get:
 *     summary: Obtener todas las calificaciones de un producto (público)
 *     tags: [Calificaciones Productos]
 *     parameters:
 *       - in: path
 *         name: productoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lista de calificaciones
 */
router.get('/productos/producto/:productoId', calificacionController.obtenerCalificacionesPorProducto);

/**
 * @swagger
 * /calificaciones/productos/producto/{productoId}/estadisticas:
 *   get:
 *     summary: Obtener estadísticas de calificaciones de un producto (público)
 *     tags: [Calificaciones Productos]
 *     parameters:
 *       - in: path
 *         name: productoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Estadísticas de calificaciones
 */
router.get('/productos/producto/:productoId/estadisticas', calificacionController.obtenerEstadisticasProducto);

// ==================== RUTAS GENERALES ====================

/**
 * @swagger
 * /calificaciones/mis-calificaciones:
 *   get:
 *     summary: Obtener todas las calificaciones realizadas por el paciente autenticado
 *     tags: [Calificaciones Generales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [medicos, productos, ambos]
 *           default: ambos
 *     responses:
 *       200:
 *         description: Calificaciones del paciente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente
 */
router.get('/mis-calificaciones', requirePaciente, (req, res) => {
  req.params.pacienteId = req.user.paciente.id;
  return calificacionController.obtenerCalificacionesPorPaciente(req, res);
});

export default router;