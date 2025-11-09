import express from 'express';
import CitaController from '../controllers/citaController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Citas
 *   description: Endpoints para agendar y gestionar citas médicas
 */

/**
 * @swagger
 * /cita/agendar:
 *   post:
 *     summary: Agendar una nueva cita médica
 *     tags: [Citas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paciente_id
 *               - medico_id
 *               - fecha_hora
 *             properties:
 *               paciente_id:
 *                 type: string
 *                 example: "935ccea2-2959-4355-8cd4-9ae937b15f7a"
 *               medico_id:
 *                 type: string
 *                 example: "0336963c-9912-4dda-92c0-eedd85a06581"
 *               fecha_hora:
 *                 type: string
 *                 example: "2025-11-12T15:00:00Z"
 *               modalidad:
 *                 type: string
 *                 example: "VIRTUAL"
 *               motivo_consulta:
 *                 type: string
 *                 example: "Consulta de control general"
 *     responses:
 *       201:
 *         description: Cita agendada correctamente
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.post('/agendar', (req, res) => CitaController.agendarCita(req, res));

/**
 * @swagger
 * /cita/{id}:
 *   get:
 *     summary: Obtener los detalles de una cita médica
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Detalles de la cita
 *       404:
 *         description: Cita no encontrada
 */
router.get('/:id', (req, res) => CitaController.obtenerCita(req, res));

/**
 * @swagger
 * /cita/cancelar/{id}:
 *   post:
 *     summary: Cancelar una cita médica
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Cita cancelada correctamente
 *       404:
 *         description: Cita no encontrada
 */
router.post('/cancelar/:id', (req, res) => CitaController.cancelarCita(req, res));

export default router;
