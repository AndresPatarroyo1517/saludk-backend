import express from 'express';
import calificacionController from '../controllers/calificacionController.js';

const router = express.Router();

// ==================== RUTAS DE CALIFICACIONES DE MÉDICOS ====================

/**
 * @swagger
 * /calificaciones/medicos:
 *   post:
 *     summary: Crear una calificación para un médico
 *     tags: [Calificaciones Médicos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pacienteId
 *               - medicoId
 *               - citaId
 *               - puntuacion
 *             properties:
 *               pacienteId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               medicoId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *               citaId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174002"
 *               puntuacion:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comentario:
 *                 type: string
 *                 example: "Excelente atención, muy profesional"
 *     responses:
 *       201:
 *         description: Calificación creada exitosamente
 *       400:
 *         description: Error en la validación o la cita no está completada
 */
router.post('/medicos', calificacionController.crearCalificacionMedico);

/**
 * @swagger
 * /calificaciones/medicos/{id}:
 *   get:
 *     summary: Obtener una calificación de médico por ID
 *     tags: [Calificaciones Médicos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la calificación
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
 *     summary: Actualizar una calificación de médico
 *     tags: [Calificaciones Médicos]
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
 *             required:
 *               - pacienteId
 *             properties:
 *               pacienteId:
 *                 type: string
 *                 format: uuid
 *               puntuacion:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comentario:
 *                 type: string
 *     responses:
 *       200:
 *         description: Calificación actualizada
 *       400:
 *         description: Error en la validación
 *       403:
 *         description: No autorizado
 */
router.put('/medicos/:id', calificacionController.actualizarCalificacionMedico);

/**
 * @swagger
 * /calificaciones/medicos/{id}:
 *   delete:
 *     summary: Eliminar una calificación de médico
 *     tags: [Calificaciones Médicos]
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
 *             required:
 *               - pacienteId
 *             properties:
 *               pacienteId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Calificación eliminada
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Calificación no encontrada
 */
router.delete('/medicos/:id', calificacionController.eliminarCalificacionMedico);

/**
 * @swagger
 * /calificaciones/medicos/medico/{medicoId}:
 *   get:
 *     summary: Obtener todas las calificaciones de un médico
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
 *           minimum: 1
 *           maximum: 5
 *         description: Filtrar por puntuación mínima
 *       - in: query
 *         name: puntuacionMax
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filtrar por puntuación máxima
 *       - in: query
 *         name: fechaDesde
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar desde fecha
 *       - in: query
 *         name: fechaHasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar hasta fecha
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Cantidad de resultados por página
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Número de resultados a saltar
 *     responses:
 *       200:
 *         description: Lista de calificaciones
 */
router.get('/medicos/medico/:medicoId', calificacionController.obtenerCalificacionesPorMedico);

/**
 * @swagger
 * /calificaciones/medicos/medico/{medicoId}/estadisticas:
 *   get:
 *     summary: Obtener estadísticas de calificaciones de un médico
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 promedio:
 *                   type: number
 *                   example: 4.5
 *                 total:
 *                   type: integer
 *                   example: 120
 *                 minimo:
 *                   type: integer
 *                   example: 1
 *                 maximo:
 *                   type: integer
 *                   example: 5
 *                 distribucion:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       puntuacion:
 *                         type: integer
 *                       cantidad:
 *                         type: integer
 */
router.get('/medicos/medico/:medicoId/estadisticas', calificacionController.obtenerEstadisticasMedico);

// ==================== RUTAS DE CALIFICACIONES DE PRODUCTOS ====================

/**
 * @swagger
 * /calificaciones/productos:
 *   post:
 *     summary: Crear una calificación para un producto
 *     tags: [Calificaciones Productos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pacienteId
 *               - productoId
 *               - compraId
 *               - puntuacion
 *             properties:
 *               pacienteId:
 *                 type: string
 *                 format: uuid
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
 *       400:
 *         description: Error en la validación
 */
router.post('/productos', calificacionController.crearCalificacionProducto);

/**
 * @swagger
 * /calificaciones/productos/{id}:
 *   get:
 *     summary: Obtener una calificación de producto por ID
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
 *     summary: Actualizar una calificación de producto
 *     tags: [Calificaciones Productos]
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
 *             required:
 *               - pacienteId
 *             properties:
 *               pacienteId:
 *                 type: string
 *                 format: uuid
 *               puntuacion:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comentario:
 *                 type: string
 *     responses:
 *       200:
 *         description: Calificación actualizada
 *       400:
 *         description: Error en la validación
 */
router.put('/productos/:id', calificacionController.actualizarCalificacionProducto);

/**
 * @swagger
 * /calificaciones/productos/{id}:
 *   delete:
 *     summary: Eliminar una calificación de producto
 *     tags: [Calificaciones Productos]
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
 *             required:
 *               - pacienteId
 *             properties:
 *               pacienteId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Calificación eliminada
 *       403:
 *         description: No autorizado
 */
router.delete('/productos/:id', calificacionController.eliminarCalificacionProducto);

/**
 * @swagger
 * /calificaciones/productos/producto/{productoId}:
 *   get:
 *     summary: Obtener todas las calificaciones de un producto
 *     tags: [Calificaciones Productos]
 *     parameters:
 *       - in: path
 *         name: productoId
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
 *         name: fechaDesde
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fechaHasta
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Lista de calificaciones
 */
router.get('/productos/producto/:productoId', calificacionController.obtenerCalificacionesPorProducto);

/**
 * @swagger
 * /calificaciones/productos/producto/{productoId}/estadisticas:
 *   get:
 *     summary: Obtener estadísticas de calificaciones de un producto
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
 * /calificaciones/paciente/{pacienteId}:
 *   get:
 *     summary: Obtener todas las calificaciones realizadas por un paciente
 *     tags: [Calificaciones Generales]
 *     parameters:
 *       - in: path
 *         name: pacienteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [medicos, productos, ambos]
 *           default: ambos
 *         description: Tipo de calificaciones a obtener
 *     responses:
 *       200:
 *         description: Calificaciones del paciente
 *       400:
 *         description: Tipo de calificación inválido
 */
router.get('/paciente/:pacienteId', calificacionController.obtenerCalificacionesPorPaciente);

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

export default router;