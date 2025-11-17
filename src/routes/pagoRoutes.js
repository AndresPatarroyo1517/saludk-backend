import express from 'express';
import PaymentController from '../controllers/pagoController.js';
import { requirePaciente, authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Pagos
 *   description: Gestión de órdenes de pago y transacciones
 */

/**
 * IMPORTANTE: El orden de las rutas importa
 * Las rutas con express.raw() deben ir antes de las rutas normales
 */

// ==================== WEBHOOK (DEBE IR PRIMERO - PÚBLICO) ====================
/**
 * @swagger
 * /pagos/webhook:
 *   post:
 *     summary: Webhook de Stripe (PÚBLICO - Solo Stripe puede llamarlo)
 *     description: Endpoint para recibir eventos de Stripe. Usa raw body para verificación.
 *     tags: [Pagos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Evento procesado
 *       400:
 *         description: Error en la verificación del webhook
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => PaymentController.handleWebhook(req, res)
);

// ==================== RUTAS PROTEGIDAS (Pacientes) ====================

/**
 * @swagger
 * /pagos/crear-orden:
 *   post:
 *     summary: Crear una orden de pago (SOLO PACIENTES)
 *     description: Crea una orden de pago para el paciente autenticado
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tipo_transaccion
 *               - metodo_pago
 *               - monto
 *             properties:
 *               tipo_transaccion:
 *                 type: string
 *                 enum: [CITA, SUSCRIPCION, COMPRA]
 *               referencia_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la cita, suscripción o compra
 *               metodo_pago:
 *                 type: string
 *                 enum: [PSE, TARJETA, CONSIGNACION]
 *               monto:
 *                 type: number
 *     responses:
 *       201:
 *         description: Orden creada exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente
 */
router.post('/crear-orden', requirePaciente, (req, res) => {
  req.body.pacienteId = req.user.paciente.id;
  return PaymentController.crearOrdenPago(req, res);
});

/**
 * @swagger
 * /pagos/confirmar/{ordenId}:
 *   post:
 *     summary: Confirmar pago manual (SOLO PACIENTE DUEÑO O ADMIN)
 *     description: Confirma un pago manual (CONSIGNACION, PASARELA)
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ordenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Pago confirmado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (no es el paciente dueño)
 *       404:
 *         description: Orden no encontrada
 */
router.post('/confirmar/:ordenId', authMiddleware, PaymentController.confirmarPagoManual);

/**
 * @swagger
 * /pagos/cancelar/{ordenId}:
 *   post:
 *     summary: Cancelar una orden de pago (SOLO PACIENTE DUEÑO)
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ordenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Orden cancelada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.post('/cancelar/:ordenId', requirePaciente, PaymentController.cancelarOrden);

/**
 * @swagger
 * /pagos/orden/{ordenId}:
 *   get:
 *     summary: Obtener una orden de pago (SOLO PACIENTE DUEÑO O ADMIN)
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ordenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Orden obtenida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Orden no encontrada
 */
router.get('/orden/:ordenId', authMiddleware, PaymentController.obtenerOrden);

/**
 * @swagger
 * /pagos/mis-ordenes:
 *   get:
 *     summary: Obtener todas las órdenes del paciente autenticado
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [PENDIENTE, COMPLETADA, FALLIDA]
 *     responses:
 *       200:
 *         description: Lista de órdenes
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente
 */
router.get('/mis-ordenes', requirePaciente, PaymentController.obtenerOrdenesPorPaciente);

/**
 * @swagger
 * /pagos/subir-comprobante/{ordenId}:
 *   post:
 *     summary: Subir comprobante de consignación (SOLO PACIENTE DUEÑO)
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ordenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - comprobante
 *             properties:
 *               comprobante:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Comprobante subido exitosamente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.post('/subir-comprobante/:ordenId', requirePaciente, PaymentController.subirComprobante);

// ==================== RUTAS DE DESARROLLO/TESTING ====================

/**
 * @swagger
 * /pagos/simular-pse/{ordenId}:
 *   post:
 *     summary: Simular confirmación PSE (SOLO DESARROLLO)
 *     description: Simula una confirmación de pago PSE para testing
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ordenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Pago PSE simulado exitosamente
 *       401:
 *         description: No autenticado
 */
router.post('/simular-pse/:ordenId', authMiddleware, PaymentController.simularPSE);

/**
 * @swagger
 * /pagos/simular-exito/{ordenId}:
 *   post:
 *     summary: Simular pago exitoso (SOLO DESARROLLO)
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ordenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Pago simulado exitosamente
 *       401:
 *         description: No autenticado
 */
router.post('/simular-exito/:ordenId', authMiddleware, PaymentController.simularPagoExitoso);

export default router;