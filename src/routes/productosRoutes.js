import express from 'express';
import ProductosController from '../controllers/productosController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Productos
 *   description: Catálogo de productos farmacéuticos
 */
/**
 * @swagger
 * /productos:
 *   get:
 *     summary: Listar productos disponibles
 *     tags: [Productos]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de productos
 */
router.get('/', async (req, res) => ProductosController.consultarCatalogo(req, res));

/**
 * POST /productos/compra
 * Body: { items: [ { productId, cantidad } ] }
 * Requires auth
 */
/**
 * @swagger
 * /productos/compra:
 *   post:
 *     summary: Procesar compra de productos
 *     tags: [Productos]
 *     parameters:
 *       - in: header
 *         name: x-paciente-id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     cantidad:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Compra procesada correctamente
 *       401:
 *         description: Paciente no autenticado
 *       403:
 *         description: Suscripción no activa
 *       409:
 *         description: Producto(s) no disponible(s)
 */
router.post('/compra', authMiddleware, async (req, res) => ProductosController.procesarCompra(req, res));

export default router;
