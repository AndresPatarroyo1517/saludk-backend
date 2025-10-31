import { ProcesadorPago } from './procesadorPago.js';
import db from '../../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';

const OrdenPago = db.Orden_Pago;

export class ProcesadorPasarela extends ProcesadorPago {
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
