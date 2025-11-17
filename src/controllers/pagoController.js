import PaymentService from '../services/pagoService.js';
import logger from '../utils/logger.js';
import db from '../models/index.js';

class PaymentController {
  /**
   * Crea una orden de pago
   * POST /api/pagos/crear-orden
   * 
   * Body:
   * {
   *   metodoPago: "TARJETA" | "PASARELA" | "CONSIGNACION",
   *   tipoOrden: "SUSCRIPCION" | "COMPRA" | "CITA",
   *   pacienteId: "uuid",
   *   monto: 50000,
   *   suscripcionId: "uuid" (opcional),
   *   compraId: "uuid" (opcional),
   *   citaId: "uuid" (opcional),
   *   currency: "cop" (opcional),
   *   metadata: {} (opcional)
   * }
   */
  async crearOrdenPago(req, res) {
    try {
      const resultado = await PaymentService.crearOrdenPago(req.body);

      // Respuesta diferente según el método de pago
      const response = {
        success: true,
        ordenId: resultado.orden.id,
        estado: resultado.orden.estado,
        monto: resultado.orden.monto,
        metodoPago: resultado.orden.metodo_pago,
        message: resultado.message
      };

      // Para TARJETA: incluir clientSecret de Stripe
      if (resultado.paymentIntent) {
        response.clientSecret = resultado.paymentIntent.client_secret;
        response.paymentIntentId = resultado.paymentIntent.id;
      }

      // Para PASARELA: incluir URL de redirección
      if (resultado.redirectUrl) {
        response.redirectUrl = resultado.redirectUrl;
      }

      // Para CONSIGNACION: incluir instrucciones
      if (resultado.instrucciones) {
        response.instrucciones = resultado.instrucciones;
      }

      res.status(201).json(response);

    } catch (error) {
      logger.error(`❌ Error en crearOrdenPago: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Webhook de Stripe
   * POST /api/pagos/webhook
   * 
   * IMPORTANTE: Este endpoint debe usar express.raw() middleware
   * para que Stripe pueda verificar la firma
   */
  async handleWebhook(req, res) {
    const signature = req.headers['stripe-signature'];

    // 🔍 DEBUG
    logger.info('============ WEBHOOK RECIBIDO ============');
    logger.info('Headers:', req.headers);
    logger.info('Signature presente:', signature ? 'SÍ' : 'NO');
    logger.info('Body type:', typeof req.body);
    logger.info('Body length:', req.body?.length || 0);

    try {
      const resultado = await PaymentService.procesarWebhookStripe(
        req.body,
        signature
      );

      logger.info(`✅ Webhook procesado: ${resultado.event}`);
      res.json({ received: true });

    } catch (error) {
      logger.error(`❌ Error en webhook: ${error.message}`);
      logger.error('Stack:', error.stack);
      res.status(400).json({
        success: false,
        error: `Webhook error: ${error.message}`
      });
    }
  }

  /**
   * Confirma un pago manual (para CONSIGNACION y PASARELA)
   * POST /api/pagos/confirmar/:ordenId
   * 
   * Body:
   * {
   *   metodoPago: "CONSIGNACION" | "PASARELA",
   *   comprobanteUrl: "url" (opcional),
   *   verificadoPor: "admin_id" (opcional),
   *   numeroComprobante: "123456" (opcional)
   * }
   */
  async confirmarPagoManual(req, res) {
    try {
      const { ordenId } = req.params;
      const { metodoPago, ...datosConfirmacion } = req.body;

      const resultado = await PaymentService.confirmarPagoManual(
        ordenId,
        datosConfirmacion,
        metodoPago
      );

      res.status(200).json({
        success: true,
        orden: resultado.orden,
        message: resultado.message
      });

    } catch (error) {
      logger.error(`❌ Error en confirmarPagoManual: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Cancela una orden de pago
   * POST /api/pagos/cancelar/:ordenId
   * 
   * Body:
   * {
   *   metodoPago: "TARJETA" | "PASARELA" | "CONSIGNACION"
   * }
   */
  async cancelarOrden(req, res) {
    try {
      const { ordenId } = req.params;
      const { metodoPago } = req.body;

      const resultado = await PaymentService.cancelarOrden(ordenId, metodoPago);

      res.status(200).json({
        success: true,
        orden: resultado.orden,
        message: resultado.message
      });

    } catch (error) {
      logger.error(`❌ Error en cancelarOrden: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene una orden de pago por ID
   * GET /api/pagos/orden/:ordenId
   */
  async obtenerOrden(req, res) {
    try {
      const { ordenId } = req.params;
      const orden = await PaymentService.obtenerOrden(ordenId);

      res.status(200).json({
        success: true,
        orden
      });

    } catch (error) {
      logger.error(`❌ Error en obtenerOrden: ${error.message}`);
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Sube comprobante de consignación
   * POST /api/pagos/subir-comprobante/:ordenId
   * 
   * Body:
   * {
   *   comprobanteUrl: "url"
   * }
   */
  async subirComprobante(req, res) {
    try {
      const { ordenId } = req.params;

      const { ProcesadorConsignacion } = await import('../jobs/factoryPagos/procesadorConsignacion.js');
      const procesador = new ProcesadorConsignacion();

      const orden = await procesador.subirComprobante(ordenId);

      res.status(200).json({
        success: true,
        orden,
        message: 'Comprobante subido exitosamente. Tu pago será verificado pronto.'
      });

    } catch (error) {
      logger.error(`❌ Error en subirComprobante: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Simula confirmación de PSE (para desarrollo/demos)
   * POST /api/pagos/simular-pse/:ordenId
   * 
   * 
   */
  async simularPSE(req, res) {
    try {
      const { ordenId } = req.params;

      const resultado = await PaymentService.simularConfirmacionPSE(ordenId);

      res.status(200).json(resultado);

    } catch (error) {
      logger.error(`❌ Error en simularPSE: ${error.message}`);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async simularPagoExitoso(req, res) {
  try {
    const { ordenId } = req.params;
    
    logger.info(`🧪 SIMULANDO pago exitoso para orden: ${ordenId}`);
    
    // Buscar la orden
    const orden = await PaymentService.obtenerOrden(ordenId);
    
    if (!orden) {
      return res.status(404).json({
        success: false,
        error: 'Orden no encontrada'
      });
    }
    
    logger.info(`📦 Orden encontrada:`, {
      id: orden.id,
      tipo_orden: orden.tipo_orden,
      suscripcion_id: orden.suscripcion_id,
      estado: orden.estado
    });
    
    if (orden.estado !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        error: `La orden ya está en estado: ${orden.estado}`
      });
    }
    
    // Simular la confirmación del pago
    logger.info(`🔄 Confirmando pago...`);
    const procesador = (await import('../jobs/pagoFactory.js')).crearProcesadorPago('TARJETA');
    
    await procesador.confirmarPago(ordenId, {
      simulado: true,
      stripe_status: 'succeeded',
      confirmed_at: new Date().toISOString()
    });
    
    logger.info(`✅ Pago confirmado`);
    
    // Activar la suscripción/compra relacionada
    const OrdenPago = db.OrdenPago;
    const Suscripcion = db.Suscripcion;
    
    const ordenActualizada = await OrdenPago.findByPk(ordenId);
    
    logger.info(`📋 Verificando tipo de orden: ${ordenActualizada.tipo_orden}`);
    logger.info(`📋 Suscripcion ID: ${ordenActualizada.suscripcion_id}`);
    
    if (ordenActualizada.tipo_orden === 'SUSCRIPCION' && ordenActualizada.suscripcion_id) {
      logger.info(`🔄 Actualizando suscripción ${ordenActualizada.suscripcion_id}...`);
      
      // Verificar que la suscripción existe
      const suscripcionExistente = await Suscripcion.findByPk(ordenActualizada.suscripcion_id);
      
      if (!suscripcionExistente) {
        logger.error(`❌ Suscripción ${ordenActualizada.suscripcion_id} NO EXISTE en la base de datos`);
      } else {
        logger.info(`📋 Suscripción encontrada. Estado actual: ${suscripcionExistente.estado}`);
        logger.info(`📋ID: ${ordenActualizada.suscripcion_id}`);
        const [numUpdated] = await Suscripcion.update(
          { estado: 'ACTIVA', fecha_actualizacion: new Date() },
          { where: { id: ordenActualizada.suscripcion_id } }
        );
        
        logger.info(`🔢 Número de registros actualizados: ${numUpdated}`);
        
        if (numUpdated > 0) {
          logger.info(`✅ Suscripción ${ordenActualizada.suscripcion_id} ACTIVADA`);
          
          // Verificar el cambio
          const suscripcionVerificada = await Suscripcion.findByPk(ordenActualizada.suscripcion_id);
          logger.info(`✅ Estado verificado: ${suscripcionVerificada.estado}`);
        } else {
          logger.error(`❌ No se actualizó ningún registro`);
        }
      }
    } else {
      logger.warn(`⚠️ La orden NO es tipo SUSCRIPCION o no tiene suscripcion_id`);
    }
    
    res.status(200).json({
      success: true,
      message: '✅ Pago simulado exitosamente',
      orden: ordenActualizada
    });
    
  } catch (error) {
    logger.error(`❌ Error simulando pago: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
}



export default new PaymentController();