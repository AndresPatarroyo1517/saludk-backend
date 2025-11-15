import express from 'express';
import PromocionesController from '../controllers/promocionesController.js';
import { requirePaciente } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Promociones
 *   description: Generación y consulta de promociones personalizadas
 */

/**
 * @swagger
 * /promociones/generar:
 *   get:
 *     summary: Generar promociones personalizadas para el paciente autenticado
 *     tags: [Promociones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Promociones generadas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente
 */
router.get('/generar', requirePaciente, async (req, res) => {
  // El pacienteId ahora viene de req.user.paciente.id
  req.params.pacienteId = req.user.paciente.id;
  return PromocionesController.generarPromocion(req, res);
});

/**
 * @swagger
 * /promociones/mis-promociones:
 *   get:
 *     summary: Obtener promociones del paciente autenticado
 *     tags: [Promociones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de promociones del paciente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente
 */
router.get('/mis-promociones', requirePaciente, async (req, res) => {
  req.params.pacienteId = req.user.paciente.id;
  return PromocionesController.obtenerMisPromociones(req, res);
});

export default router;