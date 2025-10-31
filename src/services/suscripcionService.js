const SuscripcionRepository = require('./SuscripcionRepository');
const PagoFactory = require('./pagoFactory');
const logger = require('../utils/logger');

exports.crearSuscripcion = async (pacienteId, planId, metodoPago = 'PSE') => {
  try {
    // 1️⃣ Crear la suscripción en BD
    const suscripcion = await SuscripcionRepository.create(pacienteId, planId);

    logger.info(`Suscripción ${suscripcion.id} creada. Iniciando generación de pago...`);

    // 2️⃣ Crear el procesador adecuado según método de pago
    const procesador = PagoFactory.crearProcesadorPago(metodoPago);

    // 3️⃣ Ejecutar el procesamiento de la transacción
    const ordenPago = await procesador.procesarTransaccion({
      pacienteId,
      suscripcionId: suscripcion.id,
      monto: suscripcion.monto,
      metodoPago
    });

    return { suscripcion, ordenPago };

  } catch (error) {
    logger.error(`Error en SuscripcionService.crearSuscripcion: ${error.message}`);
    throw error;
  }
};


exports.procesarPago = async (pacienteId, suscripcionId, metodoPago = 'PSE') => {
  try {
    const suscripcion = await SuscripcionRepository.findById(suscripcionId);

    if (!suscripcion) {
      const e = new Error('Suscripción no encontrada.');
      e.status = 404;
      throw e;
    }

    const procesador = PagoFactory.crearProcesadorPago(metodoPago);
    const resultado = await procesador.procesarTransaccion({
      pacienteId,
      suscripcionId,
      monto: suscripcion.monto,
      metodoPago
    });

    return resultado;
  } catch (error) {
    logger.error(`Error en SuscripcionService.procesarPago: ${error.message}`);
    throw error;
  }
};
