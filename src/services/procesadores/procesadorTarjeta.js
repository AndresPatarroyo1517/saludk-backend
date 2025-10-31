import { ProcesadorPago } from './procesadorPago.js';
import db from '../../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';

const OrdenPago = db.Orden_Pago;

export class ProcesadorTarjeta extends ProcesadorPago {
  async procesarTransaccion({ pacienteId, suscripcionId, monto }) {
    try {
      const orden = await OrdenPago.create({
        id: uuidv4(),
        tipo_orden: 'SUSCRIPCION',
        paciente_id: pacienteId,
        suscripcion_id: suscripcionId,
        monto: monto,
        metodo_pago: 'TARJETA_CREDITO',
        estado: 'PENDIENTE',
        fecha_creacion: new Date(),
      });

      logger.info(`Orden de pago creada vía TARJETA: ${orden.id}`);
      return orden;

    } catch (error) {
      logger.error(`Error en ProcesadorTarjeta: ${error.message}`);
      throw error;
    }
  }
}
