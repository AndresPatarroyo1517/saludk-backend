import { ProcesadorPago } from './procesadorPago.js';
import db from '../../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';

const OrdenPago = db.OrdenPago;

export class ProcesadorConsignacion extends ProcesadorPago {
  /**
   * Procesa transacción por Consignación (Manual)
   * El paciente debe hacer la consignación y subir el comprobante
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
      numeroCuenta = null, // Número de cuenta donde consignar
      banco = null, // Banco donde consignar
      metadata = {}
    } = datos;

    try {
      // Validaciones
      if (!monto || monto <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }

      // Generar código de referencia único para la consignación
      const codigoReferencia = this._generarCodigoReferencia();

      const orden = await OrdenPago.create({
        id: uuidv4(),
        tipo_orden: tipoOrden,
        paciente_id: pacienteId,
        suscripcion_id: suscripcionId,
        compra_id: compraId,
        cita_id: citaId,
        monto: monto,
        metodo_pago: 'CONSIGNACION',
        estado: 'PENDIENTE',
        referencia_transaccion: codigoReferencia,
        datos_transaccion: {
          codigo_referencia: codigoReferencia,
          numero_cuenta: numeroCuenta || process.env.CUENTA_BANCARIA,
          banco: banco || process.env.BANCO_CONSIGNACION || 'Bancolombia',
          instrucciones: 'Por favor realiza la consignación y sube el comprobante',
          ...metadata,
          created_at: new Date().toISOString()
        },
        comprobante_url: null, // Se llenará cuando el paciente suba el comprobante
        fecha_creacion: new Date(),
      });

      logger.info(`✅ Orden de pago creada vía CONSIGNACION: ${orden.id} | Código: ${codigoReferencia}`);

      return {
        orden,
        instrucciones: {
          mensaje: 'Realiza la consignación con los siguientes datos',
          banco: orden.datos_transaccion.banco,
          numeroCuenta: orden.datos_transaccion.numero_cuenta,
          monto: monto,
          codigoReferencia: codigoReferencia,
          nota: 'Una vez realizada la consignación, sube el comprobante para verificar tu pago'
        }
      };

    } catch (error) {
      logger.error(`❌ Error en ProcesadorConsignacion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Confirma el pago después de que el admin verifique el comprobante
   */
  async confirmarPago(ordenId, datosConfirmacion) {
    try {
      const orden = await OrdenPago.findByPk(ordenId);
      
      if (!orden) {
        throw new Error(`Orden ${ordenId} no encontrada`);
      }

      const { comprobanteUrl, verificadoPor, numeroComprobante } = datosConfirmacion;

      await orden.update({
        estado: 'COMPLETADA',
        fecha_pago: new Date(),
        fecha_actualizacion: new Date(),
        comprobante_url: comprobanteUrl || orden.comprobante_url,
        datos_transaccion: {
          ...orden.datos_transaccion,
          numero_comprobante: numeroComprobante,
          verificado_por: verificadoPor,
          confirmed_at: new Date().toISOString()
        }
      });

      logger.info(`✅ Consignación confirmada para orden: ${ordenId}`);
      return orden;

    } catch (error) {
      logger.error(`❌ Error confirmando consignación: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancela una consignación
   */
  async cancelarPago(ordenId) {
    try {
      const orden = await OrdenPago.findByPk(ordenId);
      
      if (!orden) {
        throw new Error(`Orden ${ordenId} no encontrada`);
      }

      await orden.update({
        estado: 'FALLIDA',
        fecha_actualizacion: new Date(),
        datos_transaccion: {
          ...orden.datos_transaccion,
          cancelled_at: new Date().toISOString()
        }
      });

      logger.info(`✅ Consignación cancelada para orden: ${ordenId}`);
      return orden;

    } catch (error) {
      logger.error(`❌ Error cancelando consignación: ${error.message}`);
      throw error;
    }
  }

  /**
   * Actualiza el comprobante de pago
   */
  async subirComprobante(ordenId, comprobanteUrl) {
    try {
      const orden = await OrdenPago.findByPk(ordenId);
      
      if (!orden) {
        throw new Error(`Orden ${ordenId} no encontrada`);
      }

      await orden.update({
        comprobante_url: comprobanteUrl,
        estado: 'PROCESANDO', // Cambiar estado para que admin verifique
        fecha_actualizacion: new Date(),
        datos_transaccion: {
          ...orden.datos_transaccion,
          comprobante_subido_at: new Date().toISOString()
        }
      });

      logger.info(`✅ Comprobante subido para orden: ${ordenId}`);
      return orden;

    } catch (error) {
      logger.error(`❌ Error subiendo comprobante: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera código único de referencia para la consignación
   */
  _generarCodigoReferencia() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `CON-${timestamp}-${random}`;
  }
}

export default { ProcesadorConsignacion };