import { ProcesadorPago } from './procesadorPago.js';
import db from '../../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';

const OrdenPago = db.OrdenPago;

export class ProcesadorPasarela extends ProcesadorPago {
  /**
   * Procesa transacción vía Pasarela de Pago (PSE - SIMULADO)
   * Este procesador simula el flujo de PSE sin necesitar integración real
   * Perfecto para desarrollo y demos
   * @param {Object} datos - Datos de la transacción
   */
  async procesarTransaccion(datos) {
    const {
      pacienteId,
      tipoOrden = 'SUSCRIPCION',
      suscripcionId = null,
      compraId = null,
      citaId = null,
      monto,
      metadata = {}
    } = datos;

    try {
      // Validaciones
      if (!monto || monto <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }

      // Generar referencia única simulada (como si fuera de PSE)
      const referenciaTransaccion = this._generarReferenciaPSE();

      const orden = await OrdenPago.create({
        id: uuidv4(),
        tipo_orden: tipoOrden,
        paciente_id: pacienteId,
        suscripcion_id: suscripcionId,
        compra_id: compraId,
        cita_id: citaId,
        monto: monto,
        metodo_pago: 'PASARELA',
        estado: 'PENDIENTE',
        referencia_transaccion: referenciaTransaccion,
        datos_transaccion: {
          tipo_pasarela: 'PSE_SIMULADO',
          referencia_pse: referenciaTransaccion,
          banco_simulado: 'BANCO_SIMULADO',
          mensaje: 'Transacción PSE simulada - En entorno real aquí iría PayU/Wompi',
          ...metadata,
          created_at: new Date().toISOString()
        },
        fecha_creacion: new Date(),
      });

      logger.info(`✅ Orden de pago creada vía PASARELA (PSE Simulado): ${orden.id} | Ref: ${referenciaTransaccion}`);

      return {
        orden,
        mensaje: 'Orden PSE creada exitosamente (modo simulado)',
        referencia: referenciaTransaccion,
        nota: 'Esta es una transacción simulada. En producción se integraría con PayU/Wompi'
      };

    } catch (error) {
      logger.error(`❌ Error en ProcesadorPasarela: ${error.message}`);
      throw error;
    }
  }

  /**
   * Confirma el pago PSE simulado
   * En desarrollo puedes llamar este método manualmente para simular confirmación
   */
  async confirmarPago(ordenId, datosConfirmacion = {}) {
    try {
      const orden = await OrdenPago.findByPk(ordenId);
      
      if (!orden) {
        throw new Error(`Orden ${ordenId} no encontrada`);
      }

      await orden.update({
        estado: 'COMPLETADO',
        fecha_pago: new Date(),
        fecha_actualizacion: new Date(),
        datos_transaccion: {
          ...orden.datos_transaccion,
          estado_pse: 'APROBADA',
          codigo_autorizacion: this._generarCodigoAutorizacion(),
          ...datosConfirmacion,
          confirmed_at: new Date().toISOString()
        }
      });

      logger.info(`✅ Pago PSE simulado confirmado para orden: ${ordenId}`);
      return orden;

    } catch (error) {
      logger.error(`❌ Error confirmando pago PSE: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancela un pago PSE simulado
   */
  async cancelarPago(ordenId) {
    try {
      const orden = await OrdenPago.findByPk(ordenId);
      
      if (!orden) {
        throw new Error(`Orden ${ordenId} no encontrada`);
      }

      await orden.update({
        estado: 'CANCELADO',
        fecha_actualizacion: new Date(),
        datos_transaccion: {
          ...orden.datos_transaccion,
          estado_pse: 'CANCELADA',
          cancelled_at: new Date().toISOString()
        }
      });

      logger.info(`✅ Pago PSE simulado cancelado para orden: ${ordenId}`);
      return orden;

    } catch (error) {
      logger.error(`❌ Error cancelando pago PSE: ${error.message}`);
      throw error;
    }
  }

  /**
   * Simula el rechazo de un pago PSE
   * Útil para testing
   */
  async rechazarPago(ordenId, motivo = 'Fondos insuficientes') {
    try {
      const orden = await OrdenPago.findByPk(ordenId);
      
      if (!orden) {
        throw new Error(`Orden ${ordenId} no encontrada`);
      }

      await orden.update({
        estado: 'FALLIDO',
        fecha_actualizacion: new Date(),
        datos_transaccion: {
          ...orden.datos_transaccion,
          estado_pse: 'RECHAZADA',
          motivo_rechazo: motivo,
          rejected_at: new Date().toISOString()
        }
      });

      logger.info(`❌ Pago PSE simulado rechazado para orden: ${ordenId} | Motivo: ${motivo}`);
      return orden;

    } catch (error) {
      logger.error(`❌ Error rechazando pago PSE: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera referencia única tipo PSE
   */
  _generarReferenciaPSE() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    return `PSE-${timestamp}-${random}`;
  }

  /**
   * Genera código de autorización simulado
   */
  _generarCodigoAutorizacion() {
    return `AUTH-${Math.floor(Math.random() * 9999999999).toString().padStart(10, '0')}`;
  }
}