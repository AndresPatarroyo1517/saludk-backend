import registroService from '../services/registroService.js';
import logger from '../utils/logger.js';

class RegistroController {
  /**
   * POST /api/v1/registro/paciente
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
          direccion: {
            id: resultado.direccion.id,
            ciudad: resultado.direccion.ciudad,
            departamento: resultado.direccion.departamento
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
   * POST /api/v1/registro/solicitudes/:id/documentos
   * Subir documento a una solicitud
   */
  async subirDocumento(req, res) {
    try {
      const { id: solicitudId } = req.params;
      const archivo = req.file;

      if (!archivo) {
        return res.status(400).json({
          success: false,
          error: 'No se recibió ningún archivo'
        });
      }

      const documento = await registroService.subirDocumentoSolicitud(
        solicitudId,
        archivo
      );

      res.status(201).json({
        success: true,
        message: 'Documento subido exitosamente',
        data: {
          id: documento.id,
          nombre: documento.nombre,
          tipo: documento.tipo_archivo,
          tamano_bytes: documento.tamano_bytes,
          estado: documento.estado,
          fecha_carga: documento.fecha_carga
        }
      });
    } catch (error) {
      const status = error.status || 500;
      logger.error(`Error al subir documento: ${error.message}`);

      res.status(status).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/registro/solicitudes/:id/documentos
   * Listar documentos de una solicitud
   */
  async listarDocumentos(req, res) {
    try {
      const { id: solicitudId } = req.params;
      const documentos = await registroService.listarDocumentosSolicitud(solicitudId);

      res.json({
        success: true,
        data: documentos,
        total: documentos.length
      });
    } catch (error) {
      logger.error(`Error al listar documentos: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/v1/registro/medico
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
   * GET /api/v1/registro/solicitudes
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
   * PATCH /api/v1/registro/solicitudes/:id/aprobar
   * Aprobar solicitud (HU-03)
   */
  async aprobarSolicitud(req, res) {
    try {
      const { id } = req.params;
      const revisadoPor = req.user.userId; // Del middleware de autenticación

      const resultado = await registroService.aprobarSolicitud(id, revisadoPor);

      res.json({
        success: true,
        message: 'Solicitud aprobada exitosamente. El usuario ya puede acceder a la plataforma.',
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
   * PATCH /api/v1/registro/solicitudes/:id/rechazar
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
        message: 'Solicitud rechazada. El usuario ha sido notificado del motivo.',
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