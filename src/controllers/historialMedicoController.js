import historialMedicoService from '../services/historialMedicoService.js';
import  logger  from '../utils/logger.js';

class HistorialMedicoController {
  /**
   * Obtiene el historial médico completo de un paciente
   * GET /api/medico/pacientes/:pacienteId/historial
   */
  async obtenerHistorial(req, res, next) {
    try {
      const { pacienteId } = req.params;
      const medicoId = req.user.medico.id;

      if (!pacienteId) {
        logger.error('HistorialMedicoController.obtenerHistorial error: ' + 'El ID del paciente es requerido'); 
        return res.status(400).json({
          success: false,
          message: 'El ID del paciente es requerido'
        });
      }

      const historial = await historialMedicoService.obtenerHistorial(medicoId, pacienteId);

      res.status(200).json({
        success: true,
        data: historial
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crea o actualiza el historial médico de un paciente (UPSERT)
   * POST /api/medico/pacientes/:pacienteId/historial
   * PUT /api/medico/pacientes/:pacienteId/historial
   */
  async crearOActualizarHistorial(req, res, next) {
    try {
      const { pacienteId } = req.params;
      const medicoId = req.user.medico.id;
      const data = req.body;

      if (!pacienteId) {
        logger.error('HistorialMedicoController.crearOActualizarHistorial error: ' + 'El ID del paciente es requerido'); 
        return res.status(400).json({
          success: false,
          message: 'El ID del paciente es requerido'
        });
      }

      if (!data || Object.keys(data).length === 0) {
        logger.error('HistorialMedicoController.crearOActualizarHistorial error: ' + 'Debe enviar al menos un campo para actualizar'); 
        return res.status(400).json({
          success: false,
          message: 'Debe enviar al menos un campo para actualizar'
        });
      }

      const historial = await historialMedicoService.crearOActualizarHistorial(
        medicoId,
        pacienteId,
        data
      );

      res.status(200).json({
        success: true,
        message: 'Historial médico guardado exitosamente',
        data: historial
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza parcialmente el historial médico
   * PATCH /api/medico/pacientes/:pacienteId/historial
   */
  async actualizarHistorialParcial(req, res, next) {
    try {
      const { pacienteId } = req.params;
      const medicoId = req.user.medico.id;
      const data = req.body;

      if (!pacienteId) {
        logger.error('HistorialMedicoController.actualizarHistorialParcial error: ' + 'El ID del paciente es requerido'); 
        return res.status(400).json({
          success: false,
          message: 'El ID del paciente es requerido'
        });
      }

      if (!data || Object.keys(data).length === 0) {
        logger.error('HistorialMedicoController.actualizarHistorialParcial error: ' + 'Debe enviar al menos un campo para actualizar'); 
        return res.status(400).json({
          success: false,
          message: 'Debe enviar al menos un campo para actualizar'
        });
      }

      const historial = await historialMedicoService.actualizarHistorialParcial(
        medicoId,
        pacienteId,
        data
      );

      res.status(200).json({
        success: true,
        message: 'Historial médico actualizado exitosamente',
        data: historial
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene todos los pacientes del médico con sus historiales
   * GET /api/medico/pacientes
   */
  async obtenerPacientesConHistorial(req, res, next) {
    try {
      const medicoId = req.user.medico.id;

      const pacientes = await historialMedicoService.obtenerPacientesConHistorial(medicoId);

      res.status(200).json({
        success: true,
        data: pacientes,
        total: pacientes.length
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new HistorialMedicoController();