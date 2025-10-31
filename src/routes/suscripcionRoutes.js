const express = require('express');
const router = express.Router();
const SuscripcionController = require('../controllers/suscripcionController');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Suscripción
 *   description: Endpoints para gestionar suscripciones y pagos
 */

/**
 * @swagger
 * /suscripcion:
 *   post:
 *     summary: Crear una nueva suscripción
 *     description: Permite al paciente seleccionar un plan y generar una orden de pago.
 *     tags: [Suscripción]
 *     parameters:
 *       - in: header
 *         name: x-paciente-id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID del paciente autenticado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planId:
 *                 type: string
 *                 example: "b72af9d1-9c33-4a7d-98b1-7fa4b98b4ab9"
 *               metodoPago:
 *                 type: string
 *                 enum: [PSE, TARJETA, CONSIGNACION]
 *                 example: "PSE"
 *     responses:
 *       201:
 *         description: Suscripción creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Suscripción creada correctamente."
 *                 data:
 *                   type: object
 *       400:
 *         description: Error en los datos de entrada
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', authMiddleware, (req, res) =>
  SuscripcionController.crearSuscripcion(req, res)
);

/**
 * @swagger
 * /suscripcion/pago:
 *   post:
 *     summary: Procesar pago de una suscripción existente
 *     description: Permite procesar un pago asociado a una suscripción activa o pendiente.
 *     tags: [Suscripción]
 *     parameters:
 *       - in: header
 *         name: x-paciente-id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID del paciente autenticado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               suscripcionId:
 *                 type: string
 *                 example: "81ef2432-3b4c-4e0a-b6a0-121a84e13d91"
 *               metodoPago:
 *                 type: string
 *                 enum: [PSE, TARJETA, CONSIGNACION]
 *                 example: "TARJETA"
 *     responses:
 *       200:
 *         description: Pago procesado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Pago procesado correctamente."
 *       404:
 *         description: Suscripción no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.post('/pago', authMiddleware, (req, res) =>
  SuscripcionController.procesarPago(req, res)
);

module.exports = router;
