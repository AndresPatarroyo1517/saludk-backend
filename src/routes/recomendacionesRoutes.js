import express from 'express';
import RecomendacionesController from '../controllers/recomendacionesController.js';
import { requirePaciente } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Recomendaciones
 *   description: Recomendaciones de productos basadas en historial de compras
 */

/**
 * @swagger
 * /productos/recomendaciones:
 *   get:
 *     summary: Obtener recomendaciones de productos para el paciente autenticado
 *     tags: [Recomendaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recomendaciones obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     total:
 *                       type: integer
 *                     recomendaciones:
 *                       type: array
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente
 *       500:
 *         description: Error interno
 */
router.get('/', requirePaciente, async (req, res) => {
  // El userId ahora viene de req.user.paciente.id
  req.params.userId = req.user.paciente.id;
  return RecomendacionesController.obtenerRecomendaciones(req, res);
});

/**
 * @swagger
 * /productos/{productoId}/similares:
 *   get:
 *     summary: Obtener productos similares a uno específico
 *     tags: [Recomendaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productoId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Productos similares obtenidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente
 *       404:
 *         description: Producto no encontrado
 */
router.get('/:productoId/similares', requirePaciente, async (req, res) => {
  return RecomendacionesController.obtenerProductosSimilares(req, res);
});

export default router;