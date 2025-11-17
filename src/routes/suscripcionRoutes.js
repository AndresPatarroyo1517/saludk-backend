import express from 'express';
import SuscripcionController from '../controllers/suscripcionController.js';
import { requirePaciente } from '../middlewares/authMiddleware.js';

const router = express.Router();

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
 *     summary: Crear una nueva suscripción para el paciente autenticado
 *     description: Permite al paciente seleccionar un plan y generar una orden de pago.
 *     tags: [Suscripción]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *               - metodoPago
 *             properties:
 *               planId:
 *                 type: string
 *                 example: "874ce33a-b97a-4624-b3d7-3692d4c0fa5e"
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
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', requirePaciente, (req, res) => {
  // El pacienteId ahora viene de req.user.paciente.id
  req.body.pacienteId = req.user.paciente.id;
  return SuscripcionController.crearSuscripcion(req, res);
});

/**
 * @swagger
 * /suscripcion/pago:
 *   post:
 *     summary: Procesar pago de una suscripción existente del paciente autenticado
 *     description: Permite procesar un pago asociado a una suscripción activa o pendiente.
 *     tags: [Suscripción]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - suscripcionId
 *               - metodoPago
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
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente o suscripción no pertenece al paciente
 *       404:
 *         description: Suscripción no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.post('/pago', requirePaciente, (req, res) => {
  // El pacienteId ahora viene de req.user.paciente.id
  req.body.pacienteId = req.user.paciente.id;
  return SuscripcionController.procesarPago(req, res);
});

/**
 * @swagger
 * /suscripcion/mis-suscripciones:
 *   get:
 *     summary: Obtener todas las suscripciones del paciente autenticado
 *     tags: [Suscripción]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de suscripciones
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente
 */
router.get('/mis-suscripciones', requirePaciente, (req, res) => {
  req.params.pacienteId = req.user.paciente.id;
  return SuscripcionController.obtenerMisSuscripciones(req, res);
});
/**
 * @swagger
 * /suscripcion/cambiar-plan:
 *   post:
 *     summary: Cambiar el plan de suscripción de un paciente
 *     tags: [Suscripciones]
 *     description: Permite a un paciente cambiar su plan actual por uno nuevo. La autenticación se realiza mediante cookies de sesión.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nuevoPlanId
 *             properties:
 *               nuevoPlanId:
 *                 type: integer
 *                 description: ID del nuevo plan al que se desea cambiar.
 *                 example: 2
 *               metodoPago:
 *                 type: string
 *                 description: Método de pago para la nueva suscripción (opcional).
 *                 example: "tarjeta"
 *     responses:
 *       200:
 *         description: Plan cambiado exitosamente
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
 *                   example: "Plan cambiado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     suscripcionAnterior:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         plan:
 *                           type: string
 *                         estado:
 *                           type: string
 *                     nuevaSuscripcion:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         plan_id:
 *                           type: integer
 *                         plan_nombre:
 *                           type: string
 *                         estado:
 *                           type: string
 *                         fecha_inicio:
 *                           type: string
 *                           format: date-time
 *                         fecha_vencimiento:
 *                           type: string
 *                           format: date-time
 *                     ordenPago:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         monto:
 *                           type: number
 *                         estado:
 *                           type: string
 *       400:
 *         description: Error de validación o plan no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "No tienes una suscripción activa para cambiar"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error al cambiar el plan"
 *                 error:
 *                   type: string
 *                   example: "Detalles del error"
 */

router.post('/cambiar-plan', requirePaciente, SuscripcionController.cambiarPlan);

export default router;