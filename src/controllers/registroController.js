import { 
  crearSolicitudPaciente, 
  registrarMedico,
  aprobarSolicitud,
  rechazarSolicitud,
  listarSolicitudesPendientes
} from "../services/registroService.js";
import logger from '../utils/logger.js';

export const registrarPacienteController = async (req, res) => {
  try {
    const { usuario, paciente } = req.body;

    if (!usuario || !paciente) {
      return res.status(400).json({
        success: false,
        message: "Se requieren datos de usuario y paciente."
      });
    }

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

    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const registrarMedicoController = async (req, res) => {
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
    logger.error(`Error al registrar médico: ${error.message}`);

    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const listarSolicitudesController = async (req, res) => {
  try {
    const { estado } = req.query;
    const solicitudes = await listarSolicitudesPendientes({ estado });

    return res.status(200).json({
      success: true,
      data: solicitudes,
      total: solicitudes.length
    });
  } catch (error) {
    logger.error(`Error al listar solicitudes: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const aprobarSolicitudController = async (req, res) => {
  try {
    const { id } = req.params;
    const revisadoPor = req.user.id;
    const resultado = await aprobarSolicitud(id, revisadoPor);

    return res.status(200).json({
      success: true,
      message: "Solicitud aprobada exitosamente.",
      data: {
        solicitud_id: resultado.solicitud.id,
        estado: resultado.solicitud.estado,
        usuario_activado: resultado.usuario_activado
      }
    });
  } catch (error) {
    logger.error(`Error al aprobar solicitud: ${error.message}`);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const rechazarSolicitudController = async (req, res) => {
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
      message: "Solicitud rechazada.",
      data: {
        solicitud_id: resultado.solicitud.id,
        estado: resultado.solicitud.estado
      }
    });
  } catch (error) {
    logger.error(`Error al rechazar solicitud: ${error.message}`);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message
    });
  }
};