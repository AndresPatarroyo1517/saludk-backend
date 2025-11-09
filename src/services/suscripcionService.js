import SuscripcionRepository from '../repositories/suscripcionRepository.js';
import PaymentService from './pagoService.js';
import logger from '../utils/logger.js';
import db from '../models/index.js';

const Plan = db.Plan;
const OrdenPago = db.OrdenPago; // ✅ Corregido

/**
 * Crea una suscripción y genera la orden de pago
 */
const crearSuscripcion = async (pacienteId, planId, metodoPago = 'TARJETA') => {
  try {
    // 1. Obtener el plan
    const plan = await Plan.findByPk(planId);

    if (!plan) {
      const error = new Error('Plan no encontrado');
      error.status = 404;
      throw error;
    }

    if (!plan.activo) {
      const error = new Error('El plan no está activo');
      error.status = 400;
      throw error;
    }

    if (!plan.precio_mensual || plan.precio_mensual <= 0) {
      const error = new Error(`El plan ${plan.nombre} no tiene un precio válido`);
      error.status = 400;
      throw error;
    }

    const monto = Number(plan.precio_mensual);


    // 2. Crear la suscripción en BD
    const suscripcion = await SuscripcionRepository.create(pacienteId, planId);


    // 3. Crear orden de pago
    const resultadoPago = await PaymentService.crearOrdenPago({
      metodoPago: metodoPago,
      tipoOrden: 'SUSCRIPCION',
      pacienteId: pacienteId,
      suscripcionId: suscripcion.id,
      monto: monto,
      currency: 'cop',
      metadata: {
        plan_id: planId,
        plan_nombre: plan.nombre,
        plan_codigo: plan.codigo,
        tipo: 'nueva_suscripcion'
      }
    });

    logger.info(`✅ Orden de pago creada: ${resultadoPago.orden.id} | Método: ${metodoPago}`);

    // 4. Preparar respuesta según el método de pago
    const respuesta = {
      suscripcion: {
        id: suscripcion.id,
        plan_id: planId,
        plan_nombre: plan.nombre,
        plan_codigo: plan.codigo,
        estado: suscripcion.estado,
        fecha_inicio: suscripcion.fecha_inicio,
        fecha_vencimiento: suscripcion.fecha_vencimiento,
        monto: monto
      },
      ordenPago: {
        id: resultadoPago.orden.id,
        estado: resultadoPago.orden.estado,
        monto: resultadoPago.orden.monto,
        metodo_pago: resultadoPago.orden.metodo_pago,
        referencia: resultadoPago.orden.referencia_transaccion
      }
    };

    // Para TARJETA: incluir clientSecret de Stripe
    if (metodoPago === 'TARJETA' && resultadoPago.paymentIntent) {
      respuesta.stripe = {
        clientSecret: resultadoPago.paymentIntent.client_secret,
        paymentIntentId: resultadoPago.paymentIntent.id
      };
    }

    // Para PASARELA (PSE): incluir mensaje
    if (metodoPago === 'PASARELA') {
      respuesta.pse = {
        referencia: resultadoPago.orden.referencia_transaccion,
        mensaje: resultadoPago.message
      };
    }

    // Para CONSIGNACION: incluir instrucciones
    if (metodoPago === 'CONSIGNACION' && resultadoPago.instrucciones) {
      respuesta.consignacion = resultadoPago.instrucciones;
    }

    return respuesta;

  } catch (error) {
    logger.error(`❌ Error en SuscripcionService.crearSuscripcion: ${error.message}`);
    throw error;
  }
};

/**
 * Procesa el pago de una suscripción existente
 * ✅ CORREGIDO: Ahora busca la orden de pago existente o crea una nueva si no existe
 */
const procesarPago = async (pacienteId, suscripcionId, metodoPago = 'TARJETA') => {
  try {
    // 1. Buscar la suscripción
    const suscripcion = await SuscripcionRepository.findByIdWithPlan(suscripcionId);

    if (!suscripcion) {
      const e = new Error('Suscripción no encontrada.');
      e.status = 404;
      throw e;
    }

    // 2. Verificar que la suscripción pertenece al paciente
    if (suscripcion.paciente_id !== pacienteId) {
      const e = new Error('Esta suscripción no pertenece al paciente.');
      e.status = 403;
      throw e;
    }

    // 3. Verificar que el plan existe
    const plan = suscripcion.plan;

    if (!plan) {
      const e = new Error('Plan de la suscripción no encontrado.');
      e.status = 404;
      throw e;
    }

    if (!plan.precio_mensual || plan.precio_mensual <= 0) {
      const e = new Error('El plan no tiene un precio válido.');
      e.status = 400;
      throw e;
    }

    const monto = Number(plan.precio_mensual);

    logger.info(`💳 Procesando pago de suscripción ${suscripcionId} | Monto: ${monto} COP | Método: ${metodoPago}`);

    // 4. ✅ BUSCAR ORDEN DE PAGO EXISTENTE
    let ordenExistente = await OrdenPago.findOne({
      where: {
        suscripcion_id: suscripcionId,
        estado: 'PENDIENTE'
      },
      order: [['fecha_creacion', 'DESC']]
    });

    let resultadoPago;

    // Si ya existe una orden pendiente, usarla
    if (ordenExistente) {
      logger.info(`✅ Usando orden de pago existente: ${ordenExistente.id}`);
      
      resultadoPago = {
        success: true,
        orden: ordenExistente,
        message: 'Orden de pago ya existente'
      };

      // Si la orden es de tarjeta pero no tiene PaymentIntent, crearlo
      if (metodoPago === 'TARJETA' && !ordenExistente.referencia_transaccion) {
        const { stripe } = await import('../config/stripe.js');
        const CurrencyService = (await import('./currencyService.js')).default;
        
        const montoUSD = CurrencyService.convertirCOPaUSD(monto);
        const montoStripe = Math.round(montoUSD * 100);

        const paymentIntent = await stripe.paymentIntents.create({
          amount: montoStripe,
          currency: 'usd',
          metadata: {
            orden_id: ordenExistente.id,
            paciente_id: pacienteId,
            suscripcion_id: suscripcionId,
            plan_nombre: plan.nombre
          },
          automatic_payment_methods: { enabled: true }
        });

        // Actualizar orden con el PaymentIntent
        await ordenExistente.update({
          referencia_transaccion: paymentIntent.id,
          datos_transaccion: {
            ...ordenExistente.datos_transaccion,
            stripe_payment_intent_id: paymentIntent.id,
            stripe_client_secret: paymentIntent.client_secret,
            stripe_status: paymentIntent.status,
            monto_usd: montoUSD,
            conversion_rate: CurrencyService.USD_TO_COP
          }
        });

        resultadoPago.paymentIntent = {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          status: paymentIntent.status
        };
      } else if (metodoPago === 'TARJETA' && ordenExistente.datos_transaccion?.stripe_client_secret) {
        // Si ya tiene un PaymentIntent, devolverlo
        resultadoPago.paymentIntent = {
          id: ordenExistente.referencia_transaccion,
          client_secret: ordenExistente.datos_transaccion.stripe_client_secret,
          status: ordenExistente.datos_transaccion.stripe_status || 'requires_payment_method'
        };
      }
    } else {
      // Si no existe, crear una nueva orden
      logger.info(`📝 Creando nueva orden de pago para suscripción ${suscripcionId}`);
      
      resultadoPago = await PaymentService.crearOrdenPago({
        metodoPago: metodoPago,
        tipoOrden: 'SUSCRIPCION',
        pacienteId: pacienteId,
        suscripcionId: suscripcionId,
        monto: monto,
        currency: 'cop',
        metadata: {
          plan_id: suscripcion.plan_id,
          plan_nombre: plan.nombre,
          tipo: 'pago_suscripcion',
          renovacion: suscripcion.estado === 'VENCIDA'
        }
      });
    }

    // 5. Preparar respuesta
    const respuesta = {
      success: true,
      ordenPago: {
        id: resultadoPago.orden.id,
        estado: resultadoPago.orden.estado,
        monto: resultadoPago.orden.monto,
        metodo_pago: resultadoPago.orden.metodo_pago
      }
    };

    // Agregar datos específicos según método de pago
    if (metodoPago === 'TARJETA' && resultadoPago.paymentIntent) {
      respuesta.stripe = {
        clientSecret: resultadoPago.paymentIntent.client_secret,
        paymentIntentId: resultadoPago.paymentIntent.id
      };
    }

    if (metodoPago === 'PASARELA') {
      respuesta.pse = {
        referencia: resultadoPago.orden.referencia_transaccion,
        mensaje: resultadoPago.message || 'Procede con el pago mediante PSE'
      };
    }

    if (metodoPago === 'CONSIGNACION' && resultadoPago.instrucciones) {
      respuesta.consignacion = resultadoPago.instrucciones;
    }

    return respuesta;

  } catch (error) {
    logger.error(`❌ Error en SuscripcionService.procesarPago: ${error.message}`);
    throw error;
  }
};

/**
 * Obtiene el estado de una suscripción con su último pago
 */
const obtenerEstadoSuscripcion = async (pacienteId, suscripcionId) => {
  try {
    const suscripcion = await SuscripcionRepository.findByIdWithPlan(suscripcionId);

    if (!suscripcion || suscripcion.paciente_id !== pacienteId) {
      const e = new Error('Suscripción no encontrada.');
      e.status = 404;
      throw e;
    }

    // Buscar última orden de pago
    const ordenesPago = await OrdenPago.findAll({
      where: { suscripcion_id: suscripcionId },
      order: [['fecha_creacion', 'DESC']],
      limit: 1
    });

    const ordenPago = ordenesPago.length > 0 ? ordenesPago[0] : null;

    return {
      suscripcion: {
        ...suscripcion.toJSON(),
        monto: suscripcion.plan?.precio_mensual || 0
      },
      ordenPago: ordenPago
    };

  } catch (error) {
    logger.error(`❌ Error en obtenerEstadoSuscripcion: ${error.message}`);
    throw error;
  }
};

export default { 
  crearSuscripcion, 
  procesarPago,
  obtenerEstadoSuscripcion
};