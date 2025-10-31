import { ProcesadorPago } from './procesadorPago.js';
import db from '../../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';

const OrdenPago = db.Orden_Pago;

export class ProcesadorConsignacion extends ProcesadorPago {
  async procesarTransaccion({ pacienteId, suscripcionId, monto }) {
    try {
      const orden = await OrdenPago.create({
        id: uuidv4(),
        tipo_orden: 'SUSCRIPCION',
        paciente_id: pacienteId,
        suscripcion_id: suscripcionId,
        monto: monto,
        metodo_pago: 'CONSIGNACION',
        estado: 'PENDIENTE',
        fecha_creacion: new Date(),
      });

      logger.info(`Orden de pago creada vía CONSIGNACION: ${orden.id}`);
      return orden;

    } catch (error) {
      logger.error(`Error en ProcesadorConsignacion: ${error.message}`);
      throw error;
    }
  }
}

export default { ProcesadorConsignacion };
