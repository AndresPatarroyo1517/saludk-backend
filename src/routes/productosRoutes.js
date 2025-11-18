import express from 'express';
import ProductosController from '../controllers/productosController.js';
import { requirePaciente, authMiddleware, checkRole } from '../middlewares/authMiddleware.js';
import { defaultCacheMiddleware } from '../middlewares/cacheMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Productos
 *   description: Catálogo de productos farmacéuticos y gestión de compras
 */

// ==================== RUTA PÚBLICA ====================

/**
 * @swagger
 * /productos:
 *   get:
 *     summary: Consultar catálogo de productos (PÚBLICO)
 *     tags: [Productos]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda para filtrar productos
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Categoría específica de productos
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Número de página para paginación
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Límite de productos por página
 *     responses:
 *       200:
 *         description: Catálogo de productos obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       nombre:
 *                         type: string
 *                       descripcion:
 *                         type: string
 *                       precio:
 *                         type: number
 *                       categoria:
 *                         type: string
 *                       disponible:
 *                         type: boolean
 *                       cantidad_disponible:
 *                         type: integer
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
 *                 error:
 *                   type: string
 */
router.get('/', defaultCacheMiddleware(600, 'productos'), ProductosController.consultarCatalogo);

// ==================== RUTAS PROTEGIDAS (Pacientes) ====================

/**
 * @swagger
 * /productos/compra:
 *   post:
 *     summary: Procesar una compra de productos (SOLO PACIENTES)
 *     tags: [Productos]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - direccion_entrega_id
 *             properties:
 *               items:
 *                 type: array
 *                 description: Lista de productos a comprar
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: ID del producto
 *                     cantidad:
 *                       type: integer
 *                       minimum: 1
 *                       default: 1
 *               metodoPago:
 *                 type: string
 *                 enum: [TARJETA_CREDITO, PSE, CONSIGNACION]
 *                 default: TARJETA_CREDITO
 *               codigoPromocion:
 *                 type: string
 *                 description: Código promocional opcional
 *               direccion_entrega_id:
 *                 type: string
 *                 description: ID de la dirección de entrega
 *     responses:
 *       200:
 *         description: Compra procesada exitosamente
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     compra:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         numero_orden:
 *                           type: string
 *                         paciente_id:
 *                           type: string
 *                         subtotal:
 *                           type: number
 *                         descuento:
 *                           type: number
 *                         total:
 *                           type: number
 *                         estado:
 *                           type: string
 *                     ordenPago:
 *                       type: object
 *                     montoFinal:
 *                       type: number
 *                     descuentoAplicado:
 *                       type: number
 *                     promocion:
 *                       type: object
 *                       nullable: true
 *                     stripe:
 *                       type: object
 *                       properties:
 *                         clientSecret:
 *                           type: string
 *                         paymentIntentId:
 *                           type: string
 *                     pse:
 *                       type: object
 *                     consignacion:
 *                       type: object
 *       400:
 *         description: Error en los datos de la compra
 *       403:
 *         description: Paciente sin suscripción activa
 *       409:
 *         description: Productos no disponibles en stock
 *       500:
 *         description: Error interno del servidor
 */
router.post('/compra', requirePaciente, ProductosController.procesarCompra);

/**
 * @swagger
 * /productos/compra/{compraId}/confirmar:
 *   post:
 *     summary: Confirmar compra después de pago exitoso
 *     description: Cambia estado de CARRITO a PENDIENTE y decrementa stock
 *     tags: [Productos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: compraId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la compra a confirmar
 *     responses:
 *       200:
 *         description: Compra confirmada exitosamente
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     compraId:
 *                       type: string
 *                     estado:
 *                       type: string
 *       400:
 *         description: compraId requerido
 *       404:
 *         description: Compra no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.post('/compra/:compraId/confirmar', authMiddleware, ProductosController.confirmarCompra);

/**
 * @swagger
 * /productos/compra/{compraId}/estado:
 *   patch:
 *     summary: Cambiar estado de una compra
 *     description: |
 *       Actualiza el estado siguiendo el flujo válido:
 *       CARRITO → PENDIENTE → PREPARANDO → EN_TRANSITO → ENTREGADA
 *     tags: [Productos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: compraId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la compra
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nuevoEstado
 *             properties:
 *               nuevoEstado:
 *                 type: string
 *                 enum: [PENDIENTE, PREPARANDO, EN_TRANSITO, ENTREGADA, CANCELADA]
 *                 description: Nuevo estado de la compra
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     compraId:
 *                       type: string
 *                     estadoAnterior:
 *                       type: string
 *                     estadoNuevo:
 *                       type: string
 *       400:
 *         description: Parámetros inválidos
 *       404:
 *         description: Compra no encontrada
 *       409:
 *         description: Transición de estado inválida
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/compra/:compraId/estado', authMiddleware, ProductosController.cambiarEstadoCompra);

/**
 * @swagger
 * /productos/compra/{compraId}/cancelar:
 *   post:
 *     summary: Cancelar una compra
 *     description: Cancela una compra y restaura el stock si ya había sido confirmada
 *     tags: [Productos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: compraId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la compra a cancelar
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 description: Motivo de la cancelación
 *     responses:
 *       200:
 *         description: Compra cancelada exitosamente
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     compraId:
 *                       type: string
 *                     estadoAnterior:
 *                       type: string
 *                     estadoNuevo:
 *                       type: string
 *                     stockRestaurado:
 *                       type: boolean
 *       400:
 *         description: compraId requerido
 *       403:
 *         description: No tiene permiso para cancelar esta compra
 *       404:
 *         description: Compra no encontrada
 *       409:
 *         description: No se puede cancelar una compra ya entregada
 *       500:
 *         description: Error interno del servidor
 */
router.post('/compra/:compraId/cancelar', authMiddleware, ProductosController.cancelarCompra);

/**
 * @swagger
 * /productos/compra/{compraId}:
 *   get:
 *     summary: Obtener detalle completo de una compra
 *     tags: [Productos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: compraId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la compra
 *     responses:
 *       200:
 *         description: Detalle de compra obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     numero_orden:
 *                       type: string
 *                     paciente_id:
 *                       type: string
 *                     estado:
 *                       type: string
 *                     subtotal:
 *                       type: number
 *                     descuento:
 *                       type: number
 *                     total:
 *                       type: number
 *                     productos:
 *                       type: array
 *                       items:
 *                         type: object
 *                     direccion_entrega:
 *                       type: object
 *                     pagos:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: compraId requerido
 *       403:
 *         description: No tiene permiso para ver esta compra
 *       404:
 *         description: Compra no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/compra/:compraId', authMiddleware, ProductosController.obtenerDetalleCompra);

/**
 * @swagger
 * /productos/mis-compras:
 *   get:
 *     summary: Obtener historial de compras del paciente autenticado
 *     tags: [Productos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [CARRITO, PENDIENTE, PAGADA, PREPARANDO, EN_TRANSITO, ENTREGADA, CANCELADA]
 *         description: Filtrar por estado de compra
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Límite de compras por página
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Offset para paginación
 *     responses:
 *       200:
 *         description: Historial de compras obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     compras:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       500:
 *         description: Error interno del servidor
 */
router.get('/mis-compras', requirePaciente, ProductosController.obtenerMisCompras);

export default router;