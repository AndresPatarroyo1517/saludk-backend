import SolicitudBuilder from "../jobs/solicitudBuilder.js";
import SolicitudRepository from "../repositories/solicitudRepository.js";
import { validatePasswordStrength } from "../utils/passwordUtils.js";
import { subirArchivo } from "./storjService.js";
import logger from "../utils/logger.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import fs from "fs";

/**
 * Servicio de Registro con patrón Builder + validaciones
 * Combina validaciones de dominio y persistencia de datos.
 */
class RegistroService {
  constructor() {
    this.repository = new SolicitudRepository();
  }

  /**
   * Crear solicitud de registro de paciente (HU-01)
   */
  async crearSolicitudPaciente({ usuario, paciente, direccion }) {
    try {
      // Validar estructura base con Builder
      const builder = new SolicitudBuilder();
      builder
        .setUsuarioData(usuario)
        .setPacienteData(paciente)
        .setDireccionData(direccion)
        .setTipo("paciente")
        .build();

      // Validar fortaleza de contraseña
      const passwordValidation = validatePasswordStrength(usuario.password);
      if (!passwordValidation.valid) {
        const error = new Error(passwordValidation.errors.join(", "));
        error.status = 400;
        throw error;
      }

      // Validar duplicados
      await this.verificarDuplicadosPaciente(usuario.email, paciente.numero_identificacion);

      // Hashear contraseña
      const { password_hash, salt } = await this.hashPassword(usuario.password);

      // Crear usuario, paciente, dirección y solicitud en BD
      const resultado = await this.repository.crearUsuarioPacienteYSolicitud({
        usuario: {
          email: usuario.email,
          password_hash,
          salt,
          rol: "PACIENTE",
          activo: false, // Inactivo hasta aprobación
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
          genero: paciente.genero || null,
        },
        direccion: {
          tipo: direccion.tipo,
          direccion_completa: direccion.direccion_completa,
          ciudad: direccion.ciudad,
          departamento: direccion.departamento,
          es_principal: direccion.es_principal !== undefined ? direccion.es_principal : true
        }
      });

      logger.info(`Solicitud de paciente creada: ${resultado.solicitud.id}`, {
        email: usuario.email,
      });

      return resultado;
    } catch (error) {
      logger.error(`Error en crearSolicitudPaciente: ${error.message}`);
      throw error;
    }
  }

  /**
   * Subir documento a una solicitud (HU-01)
   */
  async subirDocumentoSolicitud(solicitudId, archivo) {
    try {
      // 1. Validar que la solicitud existe y está PENDIENTE
      const solicitud = await this.repository.obtenerSolicitudPorId(solicitudId);
      
      if (!solicitud) {
        const error = new Error('Solicitud no encontrada');
        error.status = 404;
        throw error;
      }

      if (solicitud.estado !== 'PENDIENTE') {
        const error = new Error(`No se pueden subir documentos a una solicitud ${solicitud.estado}`);
        error.status = 400;
        throw error;
      }

      // 2. Calcular hash SHA-256 del archivo
      const fileBuffer = fs.readFileSync(archivo.path);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // 3. Verificar si ya existe un documento con el mismo hash
      const documentoDuplicado = await this.repository.verificarDocumentoPorHash(hash);
      if (documentoDuplicado) {
        // Borrar archivo temporal
        fs.unlinkSync(archivo.path);
        
        const error = new Error('Este documento ya fue subido anteriormente');
        error.status = 409;
        throw error;
      }

      // 4. Subir a Storj
      const resultadoStorj = await subirArchivo(archivo);

      // 5. Guardar metadata en BD
      const documento = await this.repository.crearDocumento({
        solicitud_id: solicitudId,
        nombre: resultadoStorj.nombre,
        ruta_storj: resultadoStorj.url,
        tipo_archivo: resultadoStorj.tipo,
        tamano_bytes: resultadoStorj.tamano,
        hash_sha256: hash,
        estado: 'PENDIENTE'
      });

      logger.info(`Documento subido: ${documento.id} para solicitud ${solicitudId}`);

      return documento;
    } catch (error) {
      logger.error(`Error en subirDocumentoSolicitud: ${error.message}`);
      
      // Limpiar archivo temporal si aún existe
      try {
        if (archivo && archivo.path && fs.existsSync(archivo.path)) {
          fs.unlinkSync(archivo.path);
        }
      } catch (e) {
        logger.warn(`No se pudo borrar archivo temporal: ${e.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Listar documentos de una solicitud
   */
  async listarDocumentosSolicitud(solicitudId) {
    try {
      const documentos = await this.repository.obtenerDocumentosPorSolicitud(solicitudId);
      return documentos;
    } catch (error) {
      logger.error(`Error en listarDocumentosSolicitud: ${error.message}`);
      throw error;
    }
  }

  /**
   * Registrar médico (HU-02)
   */
  async registrarMedico({ usuario, medico }) {
    try {
      // Validar estructura base con Builder
      const builder = new SolicitudBuilder();
      builder.setUsuarioData(usuario).setMedicoData(medico).setTipo("medico").build();

      // Validar fortaleza de contraseña
      const passwordValidation = validatePasswordStrength(usuario.password);
      if (!passwordValidation.valid) {
        const error = new Error(passwordValidation.errors.join(", "));
        error.status = 400;
        throw error;
      }

      // Validar duplicados
      await this.verificarDuplicadosMedico(
        usuario.email,
        medico.numero_identificacion,
        medico.registro_medico
      );

      // Hashear contraseña
      const { password_hash, salt } = await this.hashPassword(usuario.password);

      // Crear usuario y médico directamente (activo)
      const resultado = await this.repository.crearUsuarioYMedico({
        usuario: {
          email: usuario.email,
          password_hash,
          salt,
          rol: "MEDICO",
          activo: true, // médicos activos inmediatamente
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
          disponible:
            medico.disponible !== undefined ? medico.disponible : true,
          calificacion_promedio: 0.0,
        },
      });

      logger.info(`Médico registrado: ${resultado.medico.id}`);
      return resultado;
    } catch (error) {
      logger.error(`Error en registrarMedico: ${error.message}`);
      throw error;
    }
  }

  /**
   * Listar solicitudes pendientes (HU-02, HU-03)
   */
  async listarSolicitudesPendientes(estado = "PENDIENTE") {
    try {
      return await this.repository.listarSolicitudes({ estado });
    } catch (error) {
      logger.error(`Error en listarSolicitudesPendientes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Aprobar solicitud (HU-03)
   */
  async aprobarSolicitud(solicitudId, revisadoPor) {
    try {
      const solicitud = await this.repository.obtenerSolicitudPorId(solicitudId);
      if (!solicitud) {
        const e = new Error("Solicitud no encontrada.");
        e.status = 404;
        throw e;
      }

      if (solicitud.estado !== "PENDIENTE") {
        const e = new Error(`La solicitud ya fue ${solicitud.estado.toLowerCase()}.`);
        e.status = 400;
        throw e;
      }

      // Validar que tenga al menos 1 documento
      const documentos = await this.repository.obtenerDocumentosPorSolicitud(solicitudId);
      if (documentos.length === 0) {
        const e = new Error("No se puede aprobar una solicitud sin documentos.");
        e.status = 400;
        throw e;
      }

      const resultado = await this.repository.aprobarSolicitudYActivarUsuario({
        solicitudId,
        revisadoPor,
        motivo_decision: "Solicitud aprobada por el Director Médico",
      });

      logger.info(`Solicitud aprobada: ${solicitudId}`);
      return resultado;
    } catch (error) {
      logger.error(`Error en aprobarSolicitud: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rechazar solicitud (HU-03)
   * NO SE BORRAN DATOS, solo se marcan como RECHAZADOS
   */
  async rechazarSolicitud(solicitudId, revisadoPor, motivo_decision) {
    try {
      const solicitud = await this.repository.obtenerSolicitudPorId(solicitudId);
      if (!solicitud) {
        const e = new Error("Solicitud no encontrada.");
        e.status = 404;
        throw e;
      }

      if (solicitud.estado !== "PENDIENTE") {
        const e = new Error(`La solicitud ya fue ${solicitud.estado.toLowerCase()}.`);
        e.status = 400;
        throw e;
      }

      const resultado = await this.repository.rechazarSolicitud({
        solicitudId,
        revisadoPor,
        motivo_decision,
      });

      logger.info(`Solicitud rechazada: ${solicitudId}`);
      return resultado;
    } catch (error) {
      logger.error(`Error en rechazarSolicitud: ${error.message}`);
      throw error;
    }
  }

  // ===================================================
  // MÉTODOS AUXILIARES
  // ===================================================

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    return { password_hash, salt };
  }

  async verificarDuplicadosPaciente(email, numero_identificacion) {
    const emailExiste = await this.repository.verificarEmailExistente(email);
    if (emailExiste) {
      const e = new Error("El email ya está registrado.");
      e.status = 409;
      throw e;
    }

    const identificacionExiste = await this.repository.verificarIdentificacionPacienteExistente(
      numero_identificacion
    );
    if (identificacionExiste) {
      const e = new Error("El número de identificación ya está registrado.");
      e.status = 409;
      throw e;
    }
  }

  async verificarDuplicadosMedico(email, numero_identificacion, registro_medico) {
    const emailExiste = await this.repository.verificarEmailExistente(email);
    if (emailExiste) {
      const e = new Error("El email ya está registrado.");
      e.status = 409;
      throw e;
    }

    const identificacionExiste = await this.repository.verificarIdentificacionMedicoExistente(
      numero_identificacion
    );
    if (identificacionExiste) {
      const e = new Error("El número de identificación ya está registrado.");
      e.status = 409;
      throw e;
    }

    const registroExiste = await this.repository.verificarRegistroMedicoExistente(registro_medico);
    if (registroExiste) {
      const e = new Error("El registro médico ya está registrado.");
      e.status = 409;
      throw e;
    }
  }
}

export default new RegistroService();