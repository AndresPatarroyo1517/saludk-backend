import express from 'express';
import PromocionesController from '../controllers/promocionesController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Promociones
 *   description: Generación y consulta de promociones personalizadas
 */
/**
 * @swagger
 * /promociones/generar/{pacienteId}:
 *   get:
 *     summary: Generar promociones personalizadas para un paciente
 *     tags: [Promociones]
 *     parameters:
 *       - in: path
 *         name: pacienteId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Promociones generadas
 */
router.get('/generar/:pacienteId', async (req, res) => PromocionesController.generarPromocion(req, res));

export default router;
