import SuscripcionService from '../services/suscripcionService.js';
import logger from '../utils/logger.js';

class SuscripcionController {
  /**
   * Crea una suscripción y genera la orden de pago
   * POST /api/suscripciones
   * 
   * Body:
   * {
   *   planId: "uuid",
   *   metodoPago: "TARJETA" | "PASARELA" | "CONSIGNACION"
   * }
   * 
   * Headers:
   * x-paciente-id: "uuid"
   */
  async crearSuscripcion(req, res) {
    try {
      const { planId, metodoPago = 'TARJETA' } = req.body;
      const pacienteId = req.headers['x-paciente-id'];

      if (!pacienteId || !planId) {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar el ID del paciente y el plan.',
        });
      }

      logger.info(`📝 Creando suscripción para paciente ${pacienteId} con plan ${planId} | Método: ${metodoPago}`);

      const resultado = await SuscripcionService.crearSuscripcion(pacienteId, planId, metodoPago);

      // Respuesta adaptada según método de pago
      const response = {
        success: true,
        message: 'Suscripción creada correctamente.',
        data: {
          suscripcion: resultado.suscripcion,
          ordenPago: resultado.ordenPago
        }
      };

      // Para TARJETA: incluir clientSecret para Stripe Elements
      if (resultado.stripe) {
        response.data.stripe = resultado.stripe;
        response.message = 'Suscripción creada. Procede con el pago usando el clientSecret.';
      }

      // Para PSE: incluir referencia
      if (resultado.pse) {
        response.data.pse = resultado.pse;
        response.message = 'Suscripción creada. ' + resultado.pse.mensaje;
      }

      // Para CONSIGNACION: incluir instrucciones
      if (resultado.consignacion) {
        response.data.consignacion = resultado.consignacion;
        response.message = 'Suscripción creada. Realiza la consignación con los datos proporcionados.';
      }

      return res.status(201).json(response);

    } catch (error) {
      logger.error(`❌ Error en crearSuscripcion: ${error.message}`);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Error interno del servidor.',
      });
    }
  }

  /**
   * Procesa el pago de una suscripción existente
   * POST /api/suscripciones/procesar-pago
   * 
   * Body:
   * {
   *   suscripcionId: "uuid",
   *   metodoPago: "TARJETA" | "PASARELA" | "CONSIGNACION"
   * }
   * 
   * Headers:
   * x-paciente-id: "uuid"
   */
  async procesarPago(req, res) {
    try {
      const { suscripcionId, metodoPago = 'TARJETA' } = req.body;
      const pacienteId = req.headers['x-paciente-id'];

      if (!pacienteId || !suscripcionId) {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar el ID del paciente y la suscripción.',
        });
      }

      logger.info(`💳 Procesando pago de suscripción ${suscripcionId} con método ${metodoPago}`);

      const resultado = await SuscripcionService.procesarPago(pacienteId, suscripcionId, metodoPago);

      const response = {
        success: true,
        message: 'Pago procesado correctamente.',
        data: resultado
      };

      return res.status(200).json(response);

    } catch (error) {
      logger.error(`❌ Error en procesarPago: ${error.message}`);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Error interno del servidor.',
      });
    }
  }

  /**
   * Obtiene el estado de una suscripción
   * GET /api/suscripciones/:suscripcionId
   * 
   * Headers:
   * x-paciente-id: "uuid"
   */
  async obtenerSuscripcion(req, res) {
    try {
      const { suscripcionId } = req.params;
      const pacienteId = req.headers['x-paciente-id'];

      if (!pacienteId) {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar el ID del paciente.',
        });
      }

      const resultado = await SuscripcionService.obtenerEstadoSuscripcion(pacienteId, suscripcionId);

      return res.status(200).json({
        success: true,
        data: resultado
      });

    } catch (error) {
      logger.error(`❌ Error en obtenerSuscripcion: ${error.message}`);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Error interno del servidor.',
      });
    }
  }
}

export default new SuscripcionController();