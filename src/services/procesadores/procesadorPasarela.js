const { ProcesadorPago } = require('./procesadorPago');
const db = require('../../models/index');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

const OrdenPago = db.Orden_Pago;

class ProcesadorPasarela extends ProcesadorPago {
  async procesarTransaccion({ pacienteId, suscripcionId, monto, metodoPago }) {
    try {
      const orden = await OrdenPago.create({
        id: uuidv4(),
        tipo_orden: 'SUSCRIPCION',
        paciente_id: pacienteId,
        suscripcion_id: suscripcionId,
        monto: monto,
        metodo_pago: 'PASARELA',
        estado: 'PENDIENTE',
        fecha_creacion: new Date(),
      });

      logger.info(`Orden de pago creada vía PASARELA: ${orden.id}`);
      return orden;

    } catch (error) {
      logger.error(`Error en ProcesadorPasarela: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { ProcesadorPasarela };
