import SolicitudBuilder from "../jobs/solicitudBuilder.js";
import SolicitudRepository from "../repositories/solicitudRepository.js";
import logger from "../utils/logger.js";
import bcrypt from "bcrypt";

/**
 * RegistroService
 * Flujo para PACIENTES: Usuario (inactivo) + Paciente + Solicitud → Director Médico aprueba → Usuario se activa
 * Flujo para MÉDICOS: Usuario (activo) + Médico (sin solicitud, registro directo por admin)
 */

/**
 * Registra un paciente con solicitud pendiente
 * 1. Crea Usuario (activo: false)
 * 2. Crea Paciente
 * 3. Crea Solicitud (estado: PENDIENTE)
 * 4. Director Médico aprueba → Usuario.activo = true
 */
export const crearSolicitudPaciente = async ({ usuario, paciente }) => {
  try {
    // 1. Usar el Builder para construir y validar
    const builder = new SolicitudBuilder();
    const solicitudValidada = builder
      .setUsuarioData(usuario)
      .setPacienteData(paciente)
      .setTipo('paciente')
      .build();

    // 2. Usar el Repository
    const repository = new SolicitudRepository();
    
    // 3. Verificar duplicados
    await verificarDuplicadosPaciente(repository, usuario.email, paciente.numero_identificacion);

    // 4. Hash de la contraseña
    const { password_hash, salt } = await hashPassword(usuario.password);

    // 5. Crear Usuario (INACTIVO) + Paciente + Solicitud en transacción
    const resultado = await repository.crearUsuarioPacienteYSolicitud({
      usuario: {
        email: usuario.email,
        password_hash,
        salt,
        rol: 'PACIENTE', // En MAYÚSCULAS según la BD
        activo: false // Usuario inactivo hasta que se apruebe
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

/**
 * Registra un médico DIRECTAMENTE (sin solicitud)
 * Solo puede ser ejecutado por administradores
 */
export const registrarMedico = async ({ usuario, medico }) => {
  try {
    // 1. Usar el Builder para construir y validar
    const builder = new SolicitudBuilder();
    const solicitudValidada = builder
      .setUsuarioData(usuario)
      .setMedicoData(medico)
      .setTipo('medico')
      .build();

    // 2. Usar el Repository
    const repository = new SolicitudRepository();
    
    // 3. Verificar duplicados
    await verificarDuplicadosMedico(
      repository, 
      usuario.email, 
      medico.numero_identificacion,
      medico.registro_medico
    );

    // 4. Hash de la contraseña
    const { password_hash, salt } = await hashPassword(usuario.password);

    // 5. Crear usuario y médico directamente (ACTIVO, sin solicitud)
    const resultado = await repository.crearUsuarioYMedico({
      usuario: {
        email: usuario.email,
        password_hash,
        salt,
        rol: 'medico',
        activo: true // Médico activo desde el inicio
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

    logger.info(`Médico registrado exitosamente: ${resultado.medico.id}`);
    return resultado;

  } catch (error) {
    logger.error(`Error en registrarMedico: ${error.message}`);
    throw error;
  }
};

/**
 * Lista solicitudes según filtros
 */
export const listarSolicitudesPendientes = async ({ estado = 'PENDIENTE', tipo = null }) => {
  try {
    const repository = new SolicitudRepository();
    const solicitudes = await repository.listarSolicitudes({ estado });
    
    logger.info(`Solicitudes listadas: ${solicitudes.length}`);
    return solicitudes;
  } catch (error) {
    logger.error(`Error en listarSolicitudesPendientes: ${error.message}`);
    throw error;
  }
};

/**
 * Aprueba una solicitud y ACTIVA el usuario
 */
export const aprobarSolicitud = async (solicitudId, revisadoPor) => {
  try {
    const repository = new SolicitudRepository();
    
    // 1. Obtener la solicitud
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

    // 2. Aprobar solicitud y activar usuario
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

/**
 * Rechaza una solicitud y ELIMINA el usuario y paciente
 */
export const rechazarSolicitud = async (solicitudId, revisadoPor, motivo_decision) => {
  try {
    const repository = new SolicitudRepository();
    
    // 1. Obtener la solicitud
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

    // 2. Rechazar solicitud y eliminar usuario y paciente
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

// ============= FUNCIONES AUXILIARES =============

/**
 * Genera hash de contraseña con bcrypt
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);
  return { password_hash, salt };
};

/**
 * Verifica duplicados para registro de paciente
 */
const verificarDuplicadosPaciente = async (repository, email, numero_identificacion) => {
  // Verificar email
  const emailExiste = await repository.verificarEmailExistente(email);
  if (emailExiste) {
    const e = new Error("El email ya está registrado.");
    e.status = 409;
    throw e;
  }

  // Verificar número de identificación
  const identificacionExiste = await repository.verificarIdentificacionPacienteExistente(
    numero_identificacion
  );
  if (identificacionExiste) {
    const e = new Error("El número de identificación ya está registrado para un paciente.");
    e.status = 409;
    throw e;
  }
};

/**
 * Verifica duplicados para registro de médico
 */
const verificarDuplicadosMedico = async (repository, email, numero_identificacion, registro_medico) => {
  // Verificar email
  const emailExiste = await repository.verificarEmailExistente(email);
  if (emailExiste) {
    const e = new Error("El email ya está registrado.");
    e.status = 409;
    throw e;
  }

  // Verificar número de identificación
  const identificacionExiste = await repository.verificarIdentificacionMedicoExistente(
    numero_identificacion
  );
  if (identificacionExiste) {
    const e = new Error("El número de identificación ya está registrado para un médico.");
    e.status = 409;
    throw e;
  }

  // Verificar registro médico
  const registroExiste = await repository.verificarRegistroMedicoExistente(registro_medico);
  if (registroExiste) {
    const e = new Error("El registro médico ya está registrado.");
    e.status = 409;
    throw e;
  }
};