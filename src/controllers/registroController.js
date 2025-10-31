import { 
  crearSolicitudPaciente, 
  registrarMedico,
  aprobarSolicitud,
  rechazarSolicitud,
  listarSolicitudesPendientes
} from "../services/registroService.js";
import logger from '../utils/logger.js';

/**
 * RegistroController
 * Maneja el registro de pacientes (con solicitud) y médicos (directo)
 */

/**
 * POST /register/paciente
 * Crea Usuario (inactivo) + Paciente + Solicitud (PENDIENTE)
 */
export const registrarPacienteController = async (req, res, next) => {
  try {
    const { usuario, paciente } = req.body;

    if (!usuario || !paciente) {
      return res.status(400).json({
        success: false,
        message: "Se requieren datos de usuario y paciente."
      });
    }

    // Crea usuario (inactivo), paciente y solicitud
    const resultado = await crearSolicitudPaciente({ usuario, paciente });

    return res.status(201).json({
      success: true,
      message: "Solicitud de registro enviada exitosamente. Tu cuenta estará activa cuando el Director Médico apruebe la solicitud.",
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
          email: resultado.usuario.email,
          activo: resultado.usuario.activo // false
        },
        fecha_solicitud: resultado.solicitud.fecha_creacion
      }
    });
  } catch (error) {
    const status = error.status || 500;
    const message = error.message || "Error al crear solicitud de paciente";
    
    logger.error(`Error al crear solicitud de paciente: ${message}`, {
      error: error.stack,
      status: status,
      details: error.details,
      originalError: error.originalError
    });

    return res.status(status).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.stack,
        details: error.details,
        originalError: error.originalError?.message
      })
    });
  }
};

/**
 * POST /register/medico
 * Crea Usuario (activo) + Médico directamente (sin solicitud)
 * Solo admin puede ejecutar esto
 */
export const registrarMedicoController = async (req, res, next) => {
  try {
    const { usuario, medico } = req.body;

    if (!usuario || !medico) {
      return res.status(400).json({
        success: false,
        message: "Se requieren datos de usuario y médico."
      });
    }

    const resultado = await registrarMedico({ usuario, medico });

    return res.status(201).json({
      success: true,
      message: `Médico ${resultado.medico.nombres} ${resultado.medico.apellidos} registrado exitosamente.`,
      data: {
        usuario: {
          id: resultado.usuario.id,
          email: resultado.usuario.email,
          rol: resultado.usuario.rol,
          activo: resultado.usuario.activo
        },
        medico: {
          id: resultado.medico.id,
          nombres: resultado.medico.nombres,
          apellidos: resultado.medico.apellidos,
          especialidad: resultado.medico.especialidad,
          registro_medico: resultado.medico.registro_medico
        }
      }
    });
  } catch (error) {
    const status = error.status || 500;
    const message = error.message || "Error al registrar médico";
    
    logger.error(`Error al registrar médico: ${message}`, {
      error: error.stack,
      status: status
    });

    return res.status(status).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.stack
      })
    });
  }
};

/**
 * GET /register/solicitudes
 * Lista solicitudes según filtros
 * Solo Director Médico o Admin
 */
export const listarSolicitudesController = async (req, res, next) => {
  try {
    const { estado } = req.query;

    const solicitudes = await listarSolicitudesPendientes({ estado });

    return res.status(200).json({
      success: true,
      message: "Solicitudes obtenidas exitosamente.",
      data: solicitudes,
      total: solicitudes.length
    });
  } catch (error) {
    const status = error.status || 500;
    logger.error(`Error al listar solicitudes: ${error.message}`);

    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * PUT /register/solicitudes/:id/aprobar
 * Aprueba solicitud y activa el usuario
 * Solo Director Médico o Admin
 */
export const aprobarSolicitudController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const revisadoPor = req.user.id;

    const resultado = await aprobarSolicitud(id, revisadoPor);

    return res.status(200).json({
      success: true,
      message: "Solicitud aprobada exitosamente. El usuario ahora está activo.",
      data: {
        solicitud_id: resultado.solicitud.id,
        estado: resultado.solicitud.estado,
        usuario_activado: resultado.usuario_activado
      }
    });
  } catch (error) {
    const status = error.status || 500;
    logger.error(`Error al aprobar solicitud: ${error.message}`);

    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * PUT /register/solicitudes/:id/rechazar
 * Rechaza solicitud y elimina usuario y paciente
 * Solo Director Médico o Admin
 */
export const rechazarSolicitudController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { motivo_decision } = req.body;
    const revisadoPor = req.user.id;

    if (!motivo_decision) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar un motivo de rechazo."
      });
    }

    const resultado = await rechazarSolicitud(id, revisadoPor, motivo_decision);

    return res.status(200).json({
      success: true,
      message: "Solicitud rechazada. El usuario y paciente han sido eliminados.",
      data: {
        solicitud_id: resultado.solicitud.id,
        estado: resultado.solicitud.estado,
        usuario_eliminado: resultado.usuario_eliminado,
        paciente_eliminado: resultado.paciente_eliminado
      }
    });
  } catch (error) {
    const status = error.status || 500;
    logger.error(`Error al rechazar solicitud: ${error.message}`);

    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};