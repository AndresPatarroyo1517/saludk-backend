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
 * Body: { items: [ { productId, cantidad } ], codigoPromocion: "CODIGO123" (opcional) }
 * Requires auth
 */
/**
 * @swagger
 * /productos/compra:
 *   post:
 *     summary: Procesar compra de productos con soporte de código de promoción
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
 *               codigoPromocion:
 *                 type: string
 *                 description: Código de promoción opcional (aplica descuento porcentual)
 *               metodoPago:
 *                 type: string
 *                 enum: [TARJETA, PSE, CONSIGNACION]
 *                 default: TARJETA
 *     responses:
 *       200:
 *         description: Compra procesada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     compra:
 *                       type: object
 *                     montoFinal:
 *                       type: number
 *                     descuentoAplicado:
 *                       type: number
 *                     promocion:
 *                       type: object
 *                       properties:
 *                         codigoPromocion:
 *                           type: string
 *                         nombre:
 *                           type: string
 *                         porcentajeDescuento:
 *                           type: number
 *                         descuentoAplicado:
 *                           type: number
 *                         montoFinal:
 *                           type: number
 *       400:
 *         description: Código de promoción inválido o datos faltantes
 *       401:
 *         description: Paciente no autenticado
 *       403:
 *         description: Suscripción no activa
 *       409:
 *         description: Producto(s) no disponible(s)
 */
router.post('/compra', authMiddleware, async (req, res) => ProductosController.procesarCompra(req, res));

export default router;
