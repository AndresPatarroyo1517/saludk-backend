import SuscripcionRepository from '../repositories/suscripcionRepository.js';
import logger from '../utils/logger.js';
import db from '../models/index.js';

const Plan = db.Plan;
const OrdenPago = db.OrdenPago;

/**
 * ✅ PASO 1: Crea una suscripción y su orden de pago pendiente
 * NO genera el PaymentIntent de Stripe todavía
 */

const cambiarPlan = async (pacienteId, nuevoPlanId, metodoPago) => {
  try {
    // Validaciones básicas
    if (!nuevoPlanId) {
      const error = new Error('El ID del nuevo plan es requerido');
      error.status = 400;
      throw error;
    }

    // Obtener suscripción activa actual
    const suscripcionActual = await SuscripcionRepository.findActiveByPacienteId(pacienteId);

    if (!suscripcionActual) {
      const error = new Error('No tienes una suscripción activa para cambiar');
      error.status = 400;
      throw error;
    }

    // Validar que el nuevo plan sea diferente
    if (suscripcionActual.plan_id === nuevoPlanId) {
      const error = new Error('Ya tienes este plan activo');
      error.status = 400;
      throw error;
    }

    // Obtener datos del nuevo plan
    const nuevoPlan = await Plan.findByPk(nuevoPlanId);
    if (!nuevoPlan || !nuevoPlan.activo) {
      const error = new Error('Plan no encontrado o no disponible');
      error.status = 404;
      throw error;
    }

    // Validar precio del plan
    if (!nuevoPlan.precio_mensual || nuevoPlan.precio_mensual <= 0) {
      const error = new Error(`El plan ${nuevoPlan.nombre} no tiene un precio válido`);
      error.status = 400;
      throw error;
    }

    const monto = Number(nuevoPlan.precio_mensual);

    // ✅ TRANSACCIÓN ATÓMICA
    const resultado = await db.sequelize.transaction(async (t) => {
      // 1. Cancelar suscripción actual
      await suscripcionActual.update(
        { 
          estado: 'CANCELADA',
          fecha_actualizacion: new Date()
        },
        { transaction: t }
      );

      // 2. Crear nueva suscripción en PENDIENTE_PAGO (NO ACTIVA)
      const fechaInicio = new Date();
      const fechaVencimiento = new Date();
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + parseInt(nuevoPlan.duracion_meses));

      const nuevaSuscripcion = await SuscripcionRepository.createWithTransaction({
        paciente_id: pacienteId,
        plan_id: nuevoPlanId,
        fecha_inicio: fechaInicio,
        fecha_vencimiento: fechaVencimiento,
        estado: 'PENDIENTE_PAGO', // ✅ CAMBIO CRÍTICO
        auto_renovable: suscripcionActual.auto_renovable,
        consultas_virtuales_usadas: 0,
        consultas_presenciales_usadas: 0
      }, t);

      // 3. Crear orden de pago PENDIENTE
      const ordenPago = await OrdenPago.create({
        paciente_id: pacienteId,
        suscripcion_id: nuevaSuscripcion.id,
        tipo_orden: 'SUSCRIPCION', // ✅ Identificador especial
        monto: monto,
        metodo_pago: metodoPago || null,
        estado: 'PENDIENTE',
        referencia_transaccion: null,
        datos_transaccion: {
          plan_anterior_id: suscripcionActual.plan_id,
          plan_nuevo_id: nuevoPlanId,
          tipo_operacion: 'CAMBIO_PLAN'
        }
      }, { transaction: t });

      return { 
        suscripcionAnterior: suscripcionActual,
        nuevaSuscripcion, 
        ordenPago,
        nuevoPlan 
      };
    });

    logger.info(`✅ Plan cambiado - Paciente ${pacienteId} | Nueva suscripción ${resultado.nuevaSuscripcion.id} | Orden: ${resultado.ordenPago.id}`);

    // ✅ Retornar datos para que el frontend pueda procesar el pago
    return {
      suscripcionAnterior: {
        id: resultado.suscripcionAnterior.id,
        plan: resultado.suscripcionAnterior.plan?.nombre,
        estado: 'CANCELADA'
      },
      nuevaSuscripcion: {
        id: resultado.nuevaSuscripcion.id,
        plan_id: nuevoPlanId,
        plan_nombre: resultado.nuevoPlan.nombre,
        estado: 'PENDIENTE_PAGO', 
        fecha_inicio: resultado.nuevaSuscripcion.fecha_inicio,
        fecha_vencimiento: resultado.nuevaSuscripcion.fecha_vencimiento,
        monto: monto
      },
      ordenPago: {
        id: resultado.ordenPago.id,
        suscripcion_id: resultado.nuevaSuscripcion.id,
        monto: monto,
        estado: 'PENDIENTE'
      }
    };

  } catch (error) {
    logger.error(`❌ Error en SuscripcionService.cambiarPlan: ${error.message}`);
    throw error;
  }
};

const crearSuscripcion = async (pacienteId, planId, metodoPago) => {
  try {
    // 1. Validar que el plan existe y está activo
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

    // 2. Crear la suscripción en estado PENDIENTE_PAGO
    const suscripcion = await SuscripcionRepository.create(pacienteId, planId);

    // 3. Crear orden de pago PENDIENTE (sin procesar aún)
    const ordenPago = await OrdenPago.create({
      paciente_id: pacienteId,
      suscripcion_id: suscripcion.id,
      tipo_orden: 'SUSCRIPCION',
      monto: monto,
      estado: 'PENDIENTE',
      metodo_pago: metodoPago, // Se define cuando el usuario elija cómo pagar
      referencia_transaccion: null,
      fecha_creacion: new Date()
    });

    logger.info(`✅ Suscripción ${suscripcion.id} creada | Orden: ${ordenPago.id} | Monto: ${monto} COP`);

    // 4. Devolver info básica
    return {
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
        id: ordenPago.id,
        estado: ordenPago.estado,
        monto: ordenPago.monto
      }
    };

  } catch (error) {
    logger.error(`❌ Error en SuscripcionService.crearSuscripcion: ${error.message}`);
    throw error;
  }
};

/**
 * ✅ PASO 2: Procesa el pago de una suscripción
 * Busca la orden pendiente y genera el PaymentIntent de Stripe
 */
const procesarPago = async (pacienteId, suscripcionId, metodoPago = 'TARJETA') => {
  try {
    // 1. Buscar la suscripción
    const suscripcion = await SuscripcionRepository.findByIdWithPlan(suscripcionId);

    if (!suscripcion) {
      const e = new Error('Suscripción no encontrada');
      e.status = 404;
      throw e;
    }

    // 2. Verificar que pertenece al paciente
    if (suscripcion.paciente_id !== pacienteId) {
      const e = new Error('Esta suscripción no pertenece al paciente');
      e.status = 403;
      throw e;
    }

    // 3. Buscar orden de pago pendiente de esta suscripción
    const ordenPago = await OrdenPago.findOne({
      where: {
        suscripcion_id: suscripcionId,
        estado: 'PENDIENTE'
      },
      order: [['fecha_creacion', 'DESC']]
    });

    if (!ordenPago) {
      const e = new Error('No se encontró una orden de pago pendiente para esta suscripción');
      e.status = 404;
      throw e;
    }

    const monto = Number(ordenPago.monto);
    const plan = suscripcion.plan;

    logger.info(`💳 Procesando pago de orden ${ordenPago.id} | Suscripción: ${suscripcionId} | Monto: ${monto} COP | Método: ${metodoPago}`);

    // 4. Actualizar método de pago elegido
    await ordenPago.update({ metodo_pago: metodoPago });

    const respuesta = {
      success: true,
      ordenPago: {
        id: ordenPago.id,
        estado: ordenPago.estado,
        monto: ordenPago.monto,
        metodo_pago: metodoPago
      }
    };

    // 5. Procesar según el método de pago
    if (metodoPago === 'TARJETA_CREDITO' || metodoPago === 'TARJETA_DEBITO') {
      // ✅ Crear PaymentIntent de Stripe
      const { stripe } = await import('../config/stripe.js');
      const CurrencyService = (await import('./currencyService.js')).default;

      const montoUSD = CurrencyService.convertirCOPaUSD(monto);
      const montoStripe = Math.round(montoUSD * 100); // Stripe usa centavos

      const paymentIntent = await stripe.paymentIntents.create({
        amount: montoStripe,
        currency: 'usd',
        metadata: {
          orden_id: ordenPago.id,
          paciente_id: pacienteId,
          suscripcion_id: ordenPago.suscripcion_id,
          plan_nombre: plan?.nombre || 'N/A',
          tipo: 'suscripcion'
        },
        automatic_payment_methods: { enabled: true }
      });

      // Guardar referencia del PaymentIntent en la orden
      await ordenPago.update({
        referencia_transaccion: paymentIntent.id,
        datos_transaccion: {
          stripe_payment_intent_id: paymentIntent.id,
          stripe_client_secret: paymentIntent.client_secret,
          stripe_status: paymentIntent.status,
          monto_usd: montoUSD,
          monto_cop: monto,
          conversion_rate: CurrencyService.USD_TO_COP,
          fecha_creacion_pi: new Date()
        }
      });

      logger.info(`✅ PaymentIntent creado: ${paymentIntent.id}`);

      respuesta.stripe = {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount_usd: montoUSD,
        amount_cop: monto
      };
    } 
    else if (metodoPago === 'PASARELA') {
      // ✅ Generar referencia para PSE
      const referencia = `PSE-${ordenPago.id}-${Date.now()}`;
      
      await ordenPago.update({
        referencia_transaccion: referencia,
        datos_transaccion: {
          tipo_pse: 'PSE',
          referencia: referencia,
          fecha_generacion: new Date()
        }
      });

      respuesta.pse = {
        referencia: referencia,
        mensaje: 'Procede con el pago mediante PSE en el portal bancario'
      };
    } 
    else if (metodoPago === 'CONSIGNACION') {
      // ✅ Generar instrucciones de consignación
      const referencia = `CONS-${ordenPago.id}`;
      
      await ordenPago.update({
        referencia_transaccion: referencia,
        datos_transaccion: {
          tipo_consignacion: 'BANCARIA',
          referencia: referencia,
          fecha_generacion: new Date()
        }
      });

      respuesta.consignacion = {
        referencia: referencia,
        banco: 'Banco XYZ',
        tipo_cuenta: 'Ahorros',
        numero_cuenta: '1234567890',
        titular: 'Salud Konrad',
        nit: '900123456-7',
        monto: monto,
        instrucciones: 'Realiza la consignación y envía el comprobante al correo pagos@saludkonrad.com'
      };
    } else {
      const e = new Error(`Método de pago no soportado: ${metodoPago}`);
      e.status = 400;
      throw e;
    }

    return respuesta;

  } catch (error) {
    logger.error(`❌ Error en SuscripcionService.procesarPago: ${error.message}`);
    throw error;
  }
};

/**
 * Obtiene el estado de una suscripción con su última orden de pago
 */
const obtenerEstadoSuscripcion = async (pacienteId, suscripcionId) => {
  try {
    const suscripcion = await SuscripcionRepository.findByIdWithPlan(suscripcionId);

    if (!suscripcion || suscripcion.paciente_id !== pacienteId) {
      const e = new Error('Suscripción no encontrada');
      e.status = 404;
      throw e;
    }

    // Buscar última orden de pago
    const ordenPago = await OrdenPago.findOne({
      where: { suscripcion_id: suscripcionId },
      order: [['fecha_creacion', 'DESC']]
    });

    return {
      suscripcion: {
        ...suscripcion.toJSON(),
        monto: suscripcion.plan?.precio_mensual || 0
      },
      ordenPago: ordenPago ? ordenPago.toJSON() : null
    };

  } catch (error) {
    logger.error(`❌ Error en obtenerEstadoSuscripcion: ${error.message}`);
    throw error;
  }
};

/**
 * Obtiene todas las suscripciones de un paciente
 */
const obtenerSuscripcionesPorPaciente = async (pacienteId) => {
  try {
    return await SuscripcionRepository.findByPacienteId(pacienteId);
  } catch (error) {
    logger.error(`❌ Error en obtenerSuscripcionesPorPaciente: ${error.message}`);
    throw error;
  }
};

export default {
  crearSuscripcion,
  procesarPago,
  obtenerEstadoSuscripcion,
  obtenerSuscripcionesPorPaciente,
  cambiarPlan
};