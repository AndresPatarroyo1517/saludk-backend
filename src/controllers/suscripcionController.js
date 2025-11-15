import SuscripcionService from '../services/suscripcionService.js';
import logger from '../utils/logger.js';

class SuscripcionController {
  /**
   * Crea una suscripción y genera la orden de pago
   * POST /api/suscripcion
   * 
   * Body:
   * {
   *   planId: "uuid",
   *   metodoPago: "TARJETA" | "PSE" | "CONSIGNACION"
   * }
   */
  async crearSuscripcion(req, res) {
    try {
      // ✅ CAMBIO CRÍTICO: El pacienteId viene de req.body.pacienteId (inyectado por la ruta)
      const pacienteId = req.body.pacienteId;
      const { planId, metodoPago = 'TARJETA' } = req.body;

      if (!pacienteId || !planId) {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar el plan (planId es requerido).',
        });
      }

      logger.info(`📋 Creando suscripción para paciente ${pacienteId} con plan ${planId} | Método: ${metodoPago}`);

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
   * POST /api/suscripcion/pago
   * 
   * Body:
   * {
   *   suscripcionId: "uuid",
   *   metodoPago: "TARJETA" | "PSE" | "CONSIGNACION"
   * }
   */
  async procesarPago(req, res) {
    try {
      const pacienteId = req.body.pacienteId;
      const { suscripcionId, metodoPago = 'TARJETA' } = req.body;

      if (!pacienteId || !suscripcionId) {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar el ID de la suscripción.',
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
   * Obtiene todas las suscripciones del paciente autenticado
   * GET /api/suscripcion/mis-suscripciones
   */
  async obtenerMisSuscripciones(req, res) {
    try {
      const pacienteId = req.params.pacienteId;

      if (!pacienteId) {
        return res.status(400).json({
          success: false,
          error: 'Paciente no autenticado.',
        });
      }

      const suscripciones = await SuscripcionService.obtenerSuscripcionesPorPaciente(pacienteId);

      return res.status(200).json({
        success: true,
        data: {
          pacienteId,
          total: suscripciones.length,
          suscripciones
        }
      });

    } catch (error) {
      logger.error(`❌ Error en obtenerMisSuscripciones: ${error.message}`);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Error interno del servidor.',
      });
    }
  }

  /**
   * Obtiene el estado de una suscripción específica
   * GET /api/suscripcion/:suscripcionId
   */
  async obtenerSuscripcion(req, res) {
    try {
      const { suscripcionId } = req.params;
      const pacienteId = req.user?.paciente?.id;

      if (!pacienteId) {
        return res.status(400).json({
          success: false,
          error: 'Paciente no autenticado.',
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