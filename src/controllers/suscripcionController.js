import SuscripcionService from '../services/suscripcionService.js';
import logger from '../utils/logger.js';

class SuscripcionController {
  async crearSuscripcion(req, res) {
    try {
      const { planId, metodoPago } = req.body;
      const pacienteId = req.headers['x-paciente-id'];

      if (!pacienteId || !planId) {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar el ID del paciente y el plan.',
        });
      }

      logger.info(`Creando suscripción para paciente ${pacienteId} con plan ${planId}`);

      const resultado = await SuscripcionService.crearSuscripcion(pacienteId, planId, metodoPago);

      return res.status(201).json({
        success: true,
        message: 'Suscripción creada correctamente.',
        data: resultado,
      });

    } catch (error) {
      logger.error(`Error en crearSuscripcion: ${error.message}`);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Error interno del servidor.',
      });
    }
  }

  async procesarPago(req, res) {
    try {
      const { suscripcionId, metodoPago } = req.body;
      const pacienteId = req.headers['x-paciente-id'];

      if (!pacienteId || !suscripcionId) {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar el ID del paciente y la suscripción.',
        });
      }

      logger.info(`Procesando pago de suscripción ${suscripcionId} con método ${metodoPago}`);

      const resultado = await SuscripcionService.procesarPago(pacienteId, suscripcionId, metodoPago);

      return res.status(200).json({
        success: true,
        message: 'Pago procesado correctamente.',
        data: resultado,
      });

    } catch (error) {
      logger.error(`Error en procesarPago: ${error.message}`);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Error interno del servidor.',
      });
    }
  }
}

export default new SuscripcionController();
