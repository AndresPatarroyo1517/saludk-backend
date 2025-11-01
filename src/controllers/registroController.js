import registroService from '../services/registroService.js';
import logger from '../utils/logger.js';

class RegistroController {
  /**
   * POST /api/v1/register/paciente
   * Registrar paciente (público - HU-01)
   */
  async registrarPaciente(req, res) {
    try {
      const data = req.validatedData; // Datos validados por Joi

      const resultado = await registroService.crearSolicitudPaciente(data);

      res.status(201).json({
        success: true,
        message: 'Solicitud de registro enviada exitosamente. Tu cuenta estará activa cuando el Director Médico apruebe la solicitud.',
        data: {
          solicitud_id: resultado.solicitud.id,
          estado: resultado.solicitud.estado,
          paciente: {
            id: resultado.paciente.id,
            nombres: resultado.paciente.nombres,
            apellidos: resultado.paciente.apellidos,
            numero_identificacion: resultado.paciente.numero_identificacion
          },
          usuario: {
            id: resultado.usuario.id,
            email: resultado.usuario.email,
            activo: resultado.usuario.activo
          },
          fecha_solicitud: resultado.solicitud.fecha_creacion
        }
      });
    } catch (error) {
      const status = error.status || 500;
      logger.error(`Error al registrar paciente: ${error.message}`);

      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/register/medico
   * Registrar médico (requiere rol ADMIN o DIRECTOR_MEDICO)
   */
  async registrarMedico(req, res) {
    try {
      const data = req.validatedData;

      const resultado = await registroService.registrarMedico(data);

      res.status(201).json({
        success: true,
        message: `Médico ${resultado.medico.nombres} ${resultado.medico.apellidos} registrado exitosamente.`,
        data: {
          usuario: resultado.usuario,
          medico: resultado.medico
        }
      });
    } catch (error) {
      const status = error.status || 500;
      logger.error(`Error al registrar médico: ${error.message}`);

      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/solicitudes
   * Listar solicitudes (HU-02, HU-03)
   */
  async listarSolicitudes(req, res) {
    try {
      const { estado } = req.query;
      const solicitudes = await registroService.listarSolicitudesPendientes(estado);

      res.json({
        success: true,
        data: solicitudes,
        total: solicitudes.length
      });
    } catch (error) {
      logger.error(`Error al listar solicitudes: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PATCH /api/v1/solicitudes/:id/aprobar
   * Aprobar solicitud (HU-03)
   */
  async aprobarSolicitud(req, res) {
    try {
      const { id } = req.params;
      const revisadoPor = req.user.userId; // Del middleware de autenticación

      const resultado = await registroService.aprobarSolicitud(id, revisadoPor);

      res.json({
        success: true,
        message: 'Solicitud aprobada exitosamente',
        data: resultado
      });
    } catch (error) {
      const status = error.status || 500;
      logger.error(`Error al aprobar solicitud: ${error.message}`);

      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PATCH /api/v1/solicitudes/:id/rechazar
   * Rechazar solicitud (HU-03)
   */
  async rechazarSolicitud(req, res) {
    try {
      const { id } = req.params;
      const { motivo_decision } = req.validatedData;
      const revisadoPor = req.user.userId;

      const resultado = await registroService.rechazarSolicitud(
        id,
        revisadoPor,
        motivo_decision
      );

      res.json({
        success: true,
        message: 'Solicitud rechazada',
        data: resultado
      });
    } catch (error) {
      const status = error.status || 500;
      logger.error(`Error al rechazar solicitud: ${error.message}`);

      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new RegistroController();