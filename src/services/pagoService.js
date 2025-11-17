import { stripe } from '../config/stripe.js';
import { crearProcesadorPago } from '../jobs/pagoFactory.js';
import db from '../models/index.js';
import logger from '../utils/logger.js';

const OrdenPago = db.OrdenPago;
const Suscripcion = db.Suscripcion;
const Compra = db.Compra;

class PaymentService {
  /**
   * Crea una orden de pago usando el Factory Pattern
   * @param {Object} datos - Datos de la orden
   * @param {string} datos.metodoPago - TARJETA, PASARELA, CONSIGNACION
   * @param {string} datos.tipoOrden - SUSCRIPCION, COMPRA, CITA
   * @param {string} datos.pacienteId - ID del paciente
   * @param {number} datos.monto - Monto a pagar
   * @param {string} datos.suscripcionId - ID suscripción (opcional)
   * @param {string} datos.compraId - ID compra (opcional)
   * @param {string} datos.citaId - ID cita (opcional)
   * @param {string} datos.currency - Moneda (default: cop)
   * @param {Object} datos.metadata - Metadata adicional
   */
  async crearOrdenPago(datos) {
    const {
      metodoPago,
      tipoOrden,
      pacienteId,
      monto,
      suscripcionId = null,
      compraId = null,
      citaId = null,
      currency = 'cop',
      metadata = {}
    } = datos;

    try {
      // Validaciones
      this._validarDatosOrden(datos);

      // Usar Factory para obtener el procesador correcto
      const procesador = crearProcesadorPago(metodoPago);

      // Procesar la transacción según el método de pago
      const resultado = await procesador.procesarTransaccion({
        pacienteId,
        tipoOrden,
        suscripcionId,
        compraId,
        citaId,
        monto,
        currency,
        metadata
      });

      logger.info(`✅ Orden de pago creada exitosamente: ${resultado.orden.id}`);
      logger.info('🔍 [DEBUG] Resultado del procesador:', {
        orden_id: resultado.orden?.id,
        tiene_paymentIntent: !!resultado.paymentIntent,
        client_secret: resultado.paymentIntent?.client_secret?.substring(0, 20) + '...',
        paymentIntent_completo: resultado.paymentIntent
      });

      return {
        success: true,
        orden: resultado.orden,
        paymentIntent: resultado.paymentIntent || null,
        redirectUrl: resultado.redirectUrl || null,
        instrucciones: resultado.instrucciones || null,
        message: resultado.message || 'Orden de pago creada exitosamente'
      };

    } catch (error) {
      logger.error(`❌ Error creando orden de pago: ${error.message}`);
      throw error;
    }
  }

  /**
   * Procesa webhook de Stripe
   * Actualiza el estado de la orden cuando Stripe confirma el pago
   */
  async procesarWebhookStripe(rawBody, signature) {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

      logger.info(`📩 Webhook recibido: ${event.type} | ID: ${event.id}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this._handlePagoExitoso(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this._handlePagoFallido(event.data.object);
          break;

        case 'payment_intent.canceled':
          await this._handlePagoCancelado(event.data.object);
          break;

        case 'payment_intent.processing':
          await this._handlePagoEnProceso(event.data.object);
          break;

        default:
          logger.info(`ℹ️ Evento no manejado: ${event.type}`);
      }

      return { received: true, event: event.type };

    } catch (error) {
      logger.error(`❌ Error procesando webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Simula confirmación de PSE (para desarrollo/demos)
   * Útil cuando no tienes integración real con PayU/Wompi
   */
  async simularConfirmacionPSE(ordenId, exito = true) {
    try {
      const procesador = crearProcesadorPago('PASARELA');

      if (exito) {
        const orden = await procesador.confirmarPago(ordenId, {
          estado_simulado: 'APROBADA',
          banco_simulado: 'BANCO_EJEMPLO',
          nota: 'Confirmación simulada para demo'
        });

        await this._actualizarEstadoRelacionado(orden);

        return {
          success: true,
          orden,
          message: 'PSE simulado confirmado exitosamente'
        };
      } else {
        const orden = await procesador.rechazarPago(ordenId, 'Simulación de rechazo');
        return {
          success: false,
          orden,
          message: 'PSE simulado rechazado'
        };
      }

    } catch (error) {
      logger.error(`❌ Error simulando PSE: ${error.message}`);
      throw error;
    }
  }

  /**
   * Confirma un pago manualmente (para CONSIGNACION y PASARELA)
   */
  async confirmarPagoManual(ordenId, datosConfirmacion, metodoPago) {
    try {
      const procesador = crearProcesadorPago(metodoPago);
      const orden = await procesador.confirmarPago(ordenId, datosConfirmacion);

      // Actualizar estado de suscripción/compra si aplica
      await this._actualizarEstadoRelacionado(orden);

      return {
        success: true,
        orden,
        message: 'Pago confirmado exitosamente'
      };

    } catch (error) {
      logger.error(`❌ Error confirmando pago manual: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancela una orden de pago
   */
  async cancelarOrden(ordenId, metodoPago) {
    try {
      const procesador = crearProcesadorPago(metodoPago);
      const orden = await procesador.cancelarPago(ordenId);

      return {
        success: true,
        orden,
        message: 'Orden cancelada exitosamente'
      };

    } catch (error) {
      logger.error(`❌ Error cancelando orden: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene una orden de pago por ID
   */
  async obtenerOrden(ordenId) {
    try {
      const orden = await OrdenPago.findByPk(ordenId);

      if (!orden) {
        throw new Error(`Orden ${ordenId} no encontrada`);
      }

      return orden;

    } catch (error) {
      logger.error(`❌ Error obteniendo orden: ${error.message}`);
      throw error;
    }
  }

  /**
 * Obtiene todas las órdenes de pago de un paciente
 * @param {string} pacienteId - ID del paciente
 * @param {Object} filtros - Filtros opcionales (estado, tipoOrden, fechaDesde, fechaHasta)
 */
async obtenerOrdenesPorPaciente(pacienteId, filtros = {}) {
  try {
    const { estado, tipoOrden, fechaDesde, fechaHasta, limit = 50, offset = 0 } = filtros;

    // Construir where clause dinámicamente
    const whereClause = { paciente_id: pacienteId };

    if (estado) {
      whereClause.estado = estado;
    }

    if (tipoOrden) {
      whereClause.tipo_orden = tipoOrden;
    }

    if (fechaDesde || fechaHasta) {
      whereClause.fecha_creacion = {};
      if (fechaDesde) {
        whereClause.fecha_creacion[db.Sequelize.Op.gte] = new Date(fechaDesde);
      }
      if (fechaHasta) {
        whereClause.fecha_creacion[db.Sequelize.Op.lte] = new Date(fechaHasta);
      }
    }

    const ordenes = await OrdenPago.findAndCountAll({
      where: whereClause,
      order: [['fecha_creacion', 'DESC']], // Más recientes primero
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Compra,
          as: 'compra',
          required: false,
          attributes: ['id', 'estado', 'total']
        }
      ]
    });

    logger.info(`📋 Órdenes obtenidas para paciente ${pacienteId}: ${ordenes.count} total`);

    return {
      ordenes: ordenes.rows,
      total: ordenes.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: ordenes.count > (parseInt(offset) + parseInt(limit))
    };

  } catch (error) {
    logger.error(`❌ Error obteniendo órdenes del paciente: ${error.message}`);
    throw error;
  }
}

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Valida los datos de la orden
   */
  _validarDatosOrden(datos) {
    const { metodoPago, tipoOrden, pacienteId, monto } = datos;

    if (!metodoPago) {
      throw new Error('El método de pago es requerido');
    }

    if (!tipoOrden) {
      throw new Error('El tipo de orden es requerido');
    }

    if (!pacienteId) {
      throw new Error('El ID del paciente es requerido');
    }

    if (!monto || monto <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    // Validar que exista el ID correspondiente según el tipo de orden
    if (tipoOrden === 'SUSCRIPCION' && !datos.suscripcionId) {
      throw new Error('El ID de suscripción es requerido para órdenes tipo SUSCRIPCION');
    }

    if (tipoOrden === 'COMPRA' && !datos.compraId) {
      throw new Error('El ID de compra es requerido para órdenes tipo COMPRA');
    }

    if (tipoOrden === 'CITA' && !datos.citaId) {
      throw new Error('El ID de cita es requerido para órdenes tipo CITA');
    }
  }

  /**
   * Maneja pago exitoso de Stripe
   */
  async _handlePagoExitoso(paymentIntent) {
    try {
      // Buscar la orden por referencia de transacción
      const orden = await OrdenPago.findOne({
        where: { referencia_transaccion: paymentIntent.id }
      });

      if (!orden) {
        logger.warn(`⚠️ Orden no encontrada para PaymentIntent: ${paymentIntent.id}`);
        return;
      }

      // Usar el procesador de tarjeta para confirmar el pago
      const procesador = crearProcesadorPago('TARJETA');
      await procesador.confirmarPago(orden.id, {
        stripe_status: paymentIntent.status,
        stripe_payment_method: paymentIntent.payment_method,
        stripe_receipt_url: paymentIntent.charges?.data[0]?.receipt_url,
      });

      // Actualizar estado de suscripción/compra
      await this._actualizarEstadoRelacionado(orden);

      logger.info(`✅ Pago exitoso procesado para orden: ${orden.id}`);

    } catch (error) {
      logger.error(`❌ Error manejando pago exitoso: ${error.message}`);
      throw error;
    }
  }

  /**
   * Maneja pago fallido de Stripe
   */
  async _handlePagoFallido(paymentIntent) {
    try {
      const orden = await OrdenPago.findOne({
        where: { referencia_transaccion: paymentIntent.id }
      });

      if (!orden) {
        logger.warn(`⚠️ Orden no encontrada para PaymentIntent: ${paymentIntent.id}`);
        return;
      }

      await orden.update({
        estado: 'FALLIDO',
        fecha_actualizacion: new Date(),
        datos_transaccion: {
          ...orden.datos_transaccion,
          stripe_status: paymentIntent.status,
          error_message: paymentIntent.last_payment_error?.message,
          failed_at: new Date().toISOString()
        }
      });

      logger.info(`❌ Pago fallido procesado para orden: ${orden.id}`);

    } catch (error) {
      logger.error(`❌ Error manejando pago fallido: ${error.message}`);
      throw error;
    }
  }

  /**
   * Maneja pago cancelado de Stripe
   */
  async _handlePagoCancelado(paymentIntent) {
    try {
      const orden = await OrdenPago.findOne({
        where: { referencia_transaccion: paymentIntent.id }
      });

      if (!orden) {
        logger.warn(`⚠️ Orden no encontrada para PaymentIntent: ${paymentIntent.id}`);
        return;
      }

      const procesador = crearProcesadorPago('TARJETA');
      await procesador.cancelarPago(orden.id);

      logger.info(`🚫 Pago cancelado procesado para orden: ${orden.id}`);

    } catch (error) {
      logger.error(`❌ Error manejando pago cancelado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Maneja pago en proceso de Stripe
   */
  async _handlePagoEnProceso(paymentIntent) {
    try {
      const orden = await OrdenPago.findOne({
        where: { referencia_transaccion: paymentIntent.id }
      });

      if (!orden) {
        logger.warn(`⚠️ Orden no encontrada para PaymentIntent: ${paymentIntent.id}`);
        return;
      }

      await orden.update({
        estado: 'PROCESANDO',
        fecha_actualizacion: new Date(),
        datos_transaccion: {
          ...orden.datos_transaccion,
          stripe_status: paymentIntent.status,
          processing_at: new Date().toISOString()
        }
      });

      logger.info(`⏳ Pago en proceso para orden: ${orden.id}`);

    } catch (error) {
      logger.error(`❌ Error manejando pago en proceso: ${error.message}`);
      throw error;
    }
  }

  /**
   * Actualiza el estado de suscripción/compra cuando el pago es exitoso
   */
  async _actualizarEstadoRelacionado(orden) {
    try {
      if (orden.tipo_orden === 'SUSCRIPCION' && orden.suscripcion_id) {
        await Suscripcion.update(
          { estado: 'ACTIVA', fecha_actualizacion: new Date() },
          { where: { id: orden.suscripcion_id } }
        );
        logger.info(`✅ Suscripción ${orden.suscripcion_id} activada`);
      }

      if (orden.tipo_orden === 'COMPRA' && orden.compra_id) {
        // ⚡ Importar dinámicamente para evitar dependencia circular
        const productosService = (await import('./productosService.js')).default;

        // Confirmar compra y actualizar stock
        await productosService.confirmarCompra(orden.compra_id);

        logger.info(`✅ Compra ${orden.compra_id} confirmada y stock actualizado`);
      }

      // TODO: Manejar CITA si aplica

    } catch (error) {
      logger.error(`❌ Error actualizando estado relacionado: ${error.message}`);
      // No lanzar error para no fallar el webhook
    }
  }
}

export default new PaymentService();