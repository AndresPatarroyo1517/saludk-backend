import express from 'express';
import RecomendacionesController from '../controllers/recomendacionesController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Recomendaciones
 *   description: Recomendaciones de productos basadas en historial de compras
 */

/**
 * @swagger
 * /productos/recomendaciones/{userId}:
 *   get:
 *     summary: Obtener recomendaciones de productos para un usuario
 *     tags: [Recomendaciones]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del paciente/usuario
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
 *       400:
 *         description: userId no proporcionado
 *       500:
 *         description: Error interno
 */
router.get('/:userId', async (req, res) => RecomendacionesController.obtenerRecomendaciones(req, res));

/**
 * @swagger
 * /productos/{productoId}/similares:
 *   get:
 *     summary: Obtener productos similares a uno específico
 *     tags: [Recomendaciones]
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
 *       404:
 *         description: Producto no encontrado
 */
router.get('/:productoId/similares', async (req, res) => RecomendacionesController.obtenerProductosSimilares(req, res));

export default router;
