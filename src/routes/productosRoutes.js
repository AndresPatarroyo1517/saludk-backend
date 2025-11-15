import express from 'express';
import ProductosController from '../controllers/productosController.js';
import { requirePaciente } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Productos
 *   description: Catálogo de productos farmacéuticos
 */

// ==================== RUTA PÚBLICA ====================

/**
 * @swagger
 * /productos:
 *   get:
 *     summary: Listar productos disponibles (PÚBLICO)
 *     description: Consulta el catálogo de productos. No requiere autenticación.
 *     tags: [Productos]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o descripción
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoría
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Productos por página
 *     responses:
 *       200:
 *         description: Lista de productos
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
 *                     productos:
 *                       type: array
 *                     paginacion:
 *                       type: object
 */
router.get('/', async (req, res) => ProductosController.consultarCatalogo(req, res));

// ==================== RUTAS PROTEGIDAS (Pacientes) ====================

/**
 * @swagger
 * /productos/compra:
 *   post:
 *     summary: Procesar compra de productos (SOLO PACIENTES)
 *     description: |
 *       Procesa una compra de productos farmacéuticos para el paciente autenticado.
 *       Soporta código de promoción opcional para aplicar descuentos.
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - metodoPago
 *             properties:
 *               items:
 *                 type: array
 *                 description: Lista de productos a comprar
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - cantidad
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                       description: ID del producto
 *                     cantidad:
 *                       type: integer
 *                       minimum: 1
 *                       description: Cantidad a comprar
 *               codigoPromocion:
 *                 type: string
 *                 description: Código de promoción opcional (aplica descuento porcentual)
 *                 example: "CODIGO123"
 *               metodoPago:
 *                 type: string
 *                 enum: [TARJETA, PSE, CONSIGNACION]
 *                 default: TARJETA
 *                 description: Método de pago
 *               direccion_entrega_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la dirección de entrega
 *           examples:
 *             compraSinPromocion:
 *               summary: Compra sin código promocional
 *               value:
 *                 items:
 *                   - productId: "123e4567-e89b-12d3-a456-426614174000"
 *                     cantidad: 2
 *                   - productId: "223e4567-e89b-12d3-a456-426614174001"
 *                     cantidad: 1
 *                 metodoPago: "TARJETA"
 *                 direccion_entrega_id: "323e4567-e89b-12d3-a456-426614174002"
 *             compraConPromocion:
 *               summary: Compra con código promocional
 *               value:
 *                 items:
 *                   - productId: "123e4567-e89b-12d3-a456-426614174000"
 *                     cantidad: 3
 *                 codigoPromocion: "DESCUENTO20"
 *                 metodoPago: "PSE"
 *                 direccion_entrega_id: "323e4567-e89b-12d3-a456-426614174002"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Compra procesada exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     compra:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         monto_total:
 *                           type: number
 *                         estado:
 *                           type: string
 *                     montoFinal:
 *                       type: number
 *                       description: Monto final después de descuentos
 *                     descuentoAplicado:
 *                       type: number
 *                       description: Monto del descuento aplicado
 *                     promocion:
 *                       type: object
 *                       nullable: true
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *             examples:
 *               sinItems:
 *                 value:
 *                   success: false
 *                   error: "Debe proporcionar al menos un producto"
 *               promocionInvalida:
 *                 value:
 *                   success: false
 *                   error: "Código de promoción inválido o expirado"
 *       401:
 *         description: No autenticado
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
 *                   example: "Token no proporcionado"
 *       403:
 *         description: Suscripción no activa o no es paciente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Debe tener una suscripción activa para realizar compras"
 *       409:
 *         description: Producto(s) no disponible(s) o sin stock
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Producto sin stock suficiente"
 *       500:
 *         description: Error interno del servidor
 */
router.post('/compra', requirePaciente, async (req, res) => {
  // El pacienteId viene de req.user.paciente.id
  req.body.pacienteId = req.user.paciente.id;
  return ProductosController.procesarCompra(req, res);
});

/**
 * @swagger
 * /productos/mis-compras:
 *   get:
 *     summary: Obtener historial de compras del paciente autenticado
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [PENDIENTE, PAGADO, ENVIADO, ENTREGADO, CANCELADO]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Historial de compras
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es paciente
 */
router.get('/mis-compras', requirePaciente, async (req, res) => {
  req.query.pacienteId = req.user.paciente.id;
  return ProductosController.obtenerMisCompras(req, res);
});

export default router;