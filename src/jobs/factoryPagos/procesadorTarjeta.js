import { ProcesadorPago } from './procesadorPago.js';
import db from '../../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';
import CurrencyService from '../../services/currencyService.js';

const OrdenPago = db.OrdenPago;

export class ProcesadorTarjeta extends ProcesadorPago {
  async procesarTransaccion(datos) {
    const {
      pacienteId,
      tipoOrden = 'SUSCRIPCION',
      suscripcionId = null,
      compraId = null,
      citaId = null,
      monto,
      currency = 'cop',
      metadata = {}
    } = datos;

    try {
      // ✅ Importar stripe dinámicamente
      const { stripe } = await import('../../config/stripe.js');
      
      if (!stripe) {
        throw new Error('Cliente de Stripe no disponible');
      }

      if (!monto || monto <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }

      const montoCOP = Number(monto);
      
      // ✅ Conversión COP → USD
      const montoUSD = CurrencyService.convertirCOPaUSD(montoCOP);
      const montoStripe = Math.round(montoUSD * 100);
      
      logger.info(`💰 Conversión: ${montoCOP} COP → ${montoUSD} USD → ${montoStripe} centavos`);

      // ✅ Crear PaymentIntent en Stripe
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: montoStripe,
          currency: 'usd',
          metadata: {
            paciente_id: pacienteId,
            tipo_orden: tipoOrden,
            suscripcion_id: suscripcionId || '',
            compra_id: compraId || '',
            cita_id: citaId || '',
            monto_cop: montoCOP,
            monto_usd: montoUSD,
            ...metadata
          },
          automatic_payment_methods: {
            enabled: true,
          },
        },
        {
          idempotencyKey: `pi_${uuidv4()}`,
        }
      );

      logger.info(`✅ PaymentIntent creado: ${paymentIntent.id}`);
      logger.info(`✅ client_secret: ${paymentIntent.client_secret?.substring(0, 20)}...`);

      // ✅ CORRECCIÓN: Usar 'TARJETA_CREDITO' (nombre que acepta la BD)
      const orden = await OrdenPago.create({
        id: uuidv4(),
        tipo_orden: tipoOrden,
        paciente_id: pacienteId,
        suscripcion_id: suscripcionId,
        compra_id: compraId,
        cita_id: citaId,
        monto: montoCOP,
        metodo_pago: 'TARJETA_CREDITO', // ✅ Usar el valor que acepta la BD
        estado: 'PENDIENTE',
        referencia_transaccion: paymentIntent.id,
        datos_transaccion: {
          stripe_payment_intent_id: paymentIntent.id,
          stripe_client_secret: paymentIntent.client_secret,
          stripe_status: paymentIntent.status,
          monto_cop: montoCOP,
          monto_usd: montoUSD,
          stripe_amount_cents: montoStripe,
          conversion_rate: CurrencyService.USD_TO_COP,
          created_at: new Date(paymentIntent.created * 1000).toISOString()
        },
        fecha_creacion: new Date(),
      });

      logger.info(`✅ Orden creada: ${orden.id} | ${montoCOP} COP ($${montoUSD} USD)`);

      // ✅ IMPORTANTE: Retornar paymentIntent con client_secret
      return {
        orden,
        paymentIntent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret, // ✅ Este es el dato crítico
          status: paymentIntent.status,
          amount_usd: montoUSD,
          amount_cop: montoCOP
        },
        message: 'Orden de pago creada. Procede con el pago usando Stripe.'
      };

    } catch (error) {
      logger.error(`❌ Error en ProcesadorTarjeta: ${error.message}`);
      logger.error(`❌ Stack: ${error.stack}`);
      
      if (error.type === 'StripeInvalidRequestError') {
        throw new Error(`Error de Stripe: ${error.message}`);
      }
      
      throw error;
    }
  }

  async confirmarPago(ordenId, datosConfirmacion) {
    try {
      const orden = await OrdenPago.findByPk(ordenId);
      
      if (!orden) {
        throw new Error(`Orden ${ordenId} no encontrada`);
      }

      await orden.update({
        estado: 'COMPLETADA', // ✅ Cambiar de COMPLETADA a COMPLETADO
        fecha_pago: new Date(),
        fecha_actualizacion: new Date(),
        datos_transaccion: {
          ...orden.datos_transaccion,
          ...datosConfirmacion,
          confirmed_at: new Date().toISOString()
        }
      });

      logger.info(`✅ Pago confirmado: ${ordenId}`);
      return orden;

    } catch (error) {
      logger.error(`❌ Error confirmando pago: ${error.message}`);
      throw error;
    }
  }

  async cancelarPago(ordenId) {
    try {
      const { stripe } = await import('../../config/stripe.js');
      
      const orden = await OrdenPago.findByPk(ordenId);
      
      if (!orden) {
        throw new Error(`Orden ${ordenId} no encontrada`);
      }

      const paymentIntentId = orden.referencia_transaccion;

      if (paymentIntentId && orden.estado === 'PENDIENTE') {
        await stripe.paymentIntents.cancel(paymentIntentId);
      }

      await orden.update({
        estado: 'FALLIDA',
        fecha_actualizacion: new Date(),
        datos_transaccion: {
          ...orden.datos_transaccion,
          cancelled_at: new Date().toISOString()
        }
      });

      logger.info(`✅ Pago cancelado: ${ordenId}`);
      return orden;

    } catch (error) {
      logger.error(`❌ Error cancelando pago: ${error.message}`);
      throw error;
    }
  }
}