import express from 'express';
import PaymentController from '../controllers/pagoController.js';

const router = express.Router();

/**
 * IMPORTANTE: El orden de las rutas importa
 * Las rutas con express.raw() deben ir antes de las rutas normales
 */

// ==================== WEBHOOK (DEBE IR PRIMERO) ====================
// Este endpoint usa raw body para verificación de Stripe
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => PaymentController.handleWebhook(req, res)
);
// ==================== RUTAS PRINCIPALES ====================

// Crear una orden de pago
router.post('/crear-orden', PaymentController.crearOrdenPago);

// Confirmar pago manual (CONSIGNACION, PASARELA)
router.post('/confirmar/:ordenId', PaymentController.confirmarPagoManual);

// Cancelar una orden de pago
router.post('/cancelar/:ordenId', PaymentController.cancelarOrden);

// Obtener una orden de pago
router.get('/orden/:ordenId', PaymentController.obtenerOrden);

// Subir comprobante de consignación
router.post('/subir-comprobante/:ordenId', PaymentController.subirComprobante);

// Simular confirmación PSE (solo para desarrollo/demos)
router.post('/simular-pse/:ordenId', PaymentController.simularPSE);

router.post('/simular-exito/:ordenId', PaymentController.simularPagoExitoso);

export default router;