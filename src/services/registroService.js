import SolicitudBuilder from "../jobs/solicitudBuilder.js";
import SolicitudRepository from "../repositories/solicitudRepository.js";
import logger from "../utils/logger.js";
import bcrypt from "bcrypt";

export const crearSolicitudPaciente = async ({ usuario, paciente }) => {
  try {
    const builder = new SolicitudBuilder();
    builder
      .setUsuarioData(usuario)
      .setPacienteData(paciente)
      .setTipo('paciente')
      .build();

    const repository = new SolicitudRepository();
    await verificarDuplicadosPaciente(repository, usuario.email, paciente.numero_identificacion);

    const { password_hash, salt } = await hashPassword(usuario.password);

    const resultado = await repository.crearUsuarioPacienteYSolicitud({
      usuario: {
        email: usuario.email,
        password_hash,
        salt,
        rol: 'PACIENTE',
        activo: false
      },
      paciente: {
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
        numero_identificacion: paciente.numero_identificacion,
        tipo_identificacion: paciente.tipo_identificacion,
        telefono: paciente.telefono || null,
        tipo_sangre: paciente.tipo_sangre || null,
        alergias: paciente.alergias || [],
        fecha_nacimiento: paciente.fecha_nacimiento || null,
        genero: paciente.genero || null
      }
    });

    logger.info(`Solicitud de paciente creada: ${resultado.solicitud.id}`);
    return resultado;
  } catch (error) {
    logger.error(`Error en crearSolicitudPaciente: ${error.message}`);
    throw error;
  }
};

export const registrarMedico = async ({ usuario, medico }) => {
  try {
    const builder = new SolicitudBuilder();
    builder
      .setUsuarioData(usuario)
      .setMedicoData(medico)
      .setTipo('medico')
      .build();

    const repository = new SolicitudRepository();
    await verificarDuplicadosMedico(repository, usuario.email, medico.numero_identificacion, medico.registro_medico);

    const { password_hash, salt } = await hashPassword(usuario.password);

    const resultado = await repository.crearUsuarioYMedico({
      usuario: {
        email: usuario.email,
        password_hash,
        salt,
        rol: 'MEDICO',
        activo: true
      },
      medico: {
        nombres: medico.nombres,
        apellidos: medico.apellidos,
        numero_identificacion: medico.numero_identificacion,
        especialidad: medico.especialidad,
        registro_medico: medico.registro_medico,
        telefono: medico.telefono || null,
        costo_consulta_presencial: medico.costo_consulta_presencial,
        costo_consulta_virtual: medico.costo_consulta_virtual,
        localidad: medico.localidad || null,
        disponible: medico.disponible !== undefined ? medico.disponible : true,
        calificacion_promedio: 0.00
      }
    });

    logger.info(`Médico registrado: ${resultado.medico.id}`);
    return resultado;
  } catch (error) {
    logger.error(`Error en registrarMedico: ${error.message}`);
    throw error;
  }
};

export const listarSolicitudesPendientes = async ({ estado = 'PENDIENTE' }) => {
  try {
    const repository = new SolicitudRepository();
    return await repository.listarSolicitudes({ estado });
  } catch (error) {
    logger.error(`Error en listarSolicitudesPendientes: ${error.message}`);
    throw error;
  }
};

export const aprobarSolicitud = async (solicitudId, revisadoPor) => {
  try {
    const repository = new SolicitudRepository();
    const solicitud = await repository.obtenerSolicitudPorId(solicitudId);
    
    if (!solicitud) {
      const e = new Error("Solicitud no encontrada.");
      e.status = 404;
      throw e;
    }

    if (solicitud.estado !== 'PENDIENTE') {
      const e = new Error(`La solicitud ya fue ${solicitud.estado.toLowerCase()}.`);
      e.status = 400;
      throw e;
    }

    const resultado = await repository.aprobarSolicitudYActivarUsuario({
      solicitudId,
      revisadoPor,
      motivo_decision: 'Solicitud aprobada por el Director Médico'
    });

    logger.info(`Solicitud aprobada: ${solicitudId}`);
    return resultado;
  } catch (error) {
    logger.error(`Error en aprobarSolicitud: ${error.message}`);
    throw error;
  }
};

export const rechazarSolicitud = async (solicitudId, revisadoPor, motivo_decision) => {
  try {
    const repository = new SolicitudRepository();
    const solicitud = await repository.obtenerSolicitudPorId(solicitudId);
    
    if (!solicitud) {
      const e = new Error("Solicitud no encontrada.");
      e.status = 404;
      throw e;
    }

    if (solicitud.estado !== 'PENDIENTE') {
      const e = new Error(`La solicitud ya fue ${solicitud.estado.toLowerCase()}.`);
      e.status = 400;
      throw e;
    }

    const resultado = await repository.rechazarSolicitudYEliminarUsuario({
      solicitudId,
      revisadoPor,
      motivo_decision
    });

    logger.info(`Solicitud rechazada: ${solicitudId}`);
    return resultado;
  } catch (error) {
    logger.error(`Error en rechazarSolicitud: ${error.message}`);
    throw error;
  }
};

// Funciones auxiliares
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);
  return { password_hash, salt };
};

const verificarDuplicadosPaciente = async (repository, email, numero_identificacion) => {
  const emailExiste = await repository.verificarEmailExistente(email);
  if (emailExiste) {
    const e = new Error("El email ya está registrado.");
    e.status = 409;
    throw e;
  }

  const identificacionExiste = await repository.verificarIdentificacionPacienteExistente(numero_identificacion);
  if (identificacionExiste) {
    const e = new Error("El número de identificación ya está registrado.");
    e.status = 409;
    throw e;
  }
};

const verificarDuplicadosMedico = async (repository, email, numero_identificacion, registro_medico) => {
  const emailExiste = await repository.verificarEmailExistente(email);
  if (emailExiste) {
    const e = new Error("El email ya está registrado.");
    e.status = 409;
    throw e;
  }

  const identificacionExiste = await repository.verificarIdentificacionMedicoExistente(numero_identificacion);
  if (identificacionExiste) {
    const e = new Error("El número de identificación ya está registrado.");
    e.status = 409;
    throw e;
  }

  const registroExiste = await repository.verificarRegistroMedicoExistente(registro_medico);
  if (registroExiste) {
    const e = new Error("El registro médico ya está registrado.");
    e.status = 409;
    throw e;
  }
};