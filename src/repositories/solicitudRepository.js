import db from "../models/index.js";
import logger from "../utils/logger.js";

// Extraer modelos y sequelize del objeto db
const { Usuario, Paciente, Medico, SolicitudRegistro, sequelize } = db;

/**
 * SolicitudRepository
 * Maneja todas las operaciones de persistencia para el módulo de registro
 */

class SolicitudRepository {
  
  // ============= MÉTODOS DE VERIFICACIÓN =============

  async verificarEmailExistente(email) {
    try {
      const usuario = await Usuario.findOne({ 
        where: { email: email.toLowerCase() } 
      });
      return !!usuario;
    } catch (error) {
      logger.error(`Error al verificar email: ${error.message}`);
      throw error;
    }
  }

  async verificarIdentificacionPacienteExistente(numero_identificacion) {
    try {
      const paciente = await Paciente.findOne({ 
        where: { numero_identificacion } 
      });
      return !!paciente;
    } catch (error) {
      logger.error(`Error al verificar identificación de paciente: ${error.message}`);
      throw error;
    }
  }

  async verificarIdentificacionMedicoExistente(numero_identificacion) {
    try {
      const medico = await Medico.findOne({ 
        where: { numero_identificacion } 
      });
      return !!medico;
    } catch (error) {
      logger.error(`Error al verificar identificación de médico: ${error.message}`);
      throw error;
    }
  }

  async verificarRegistroMedicoExistente(registro_medico) {
    try {
      const medico = await Medico.findOne({ 
        where: { registro_medico } 
      });
      return !!medico;
    } catch (error) {
      logger.error(`Error al verificar registro médico: ${error.message}`);
      throw error;
    }
  }

  // ============= CREACIÓN DE PACIENTE CON SOLICITUD =============

  /**
   * Crea Usuario (inactivo) + Paciente + Solicitud en una transacción
   * El usuario queda inactivo hasta que el Director Médico apruebe
   */
  async crearUsuarioPacienteYSolicitud({ usuario, paciente }) {
    const t = await sequelize.transaction();
    
    try {
      // 1. Crear el usuario (INACTIVO)
      const usuarioCreado = await Usuario.create({
        email: usuario.email,
        password_hash: usuario.password_hash,
        salt: usuario.salt,
        rol: usuario.rol,
        activo: false, // Inactivo hasta aprobación
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      // 2. Crear el paciente asociado al usuario
      const pacienteCreado = await Paciente.create({
        usuario_id: usuarioCreado.id,
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
        numero_identificacion: paciente.numero_identificacion,
        tipo_identificacion: paciente.tipo_identificacion,
        telefono: paciente.telefono,
        tipo_sangre: paciente.tipo_sangre,
        alergias: paciente.alergias,
        fecha_nacimiento: paciente.fecha_nacimiento,
        genero: paciente.genero,
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      // 3. Crear la solicitud (estado: PENDIENTE)
      const solicitudCreada = await SolicitudRegistro.create({
        paciente_id: pacienteCreado.id,
        estado: 'PENDIENTE',
        resultados_bd_externas: {},
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      // 4. Confirmar la transacción
      await t.commit();

      logger.info(`Usuario, paciente y solicitud creados: Usuario ${usuarioCreado.id}, Paciente ${pacienteCreado.id}, Solicitud ${solicitudCreada.id}`);

      return {
        usuario: usuarioCreado,
        paciente: pacienteCreado,
        solicitud: solicitudCreada
      };

    } catch (error) {
      await t.rollback();
      logger.error(`Error al crear usuario, paciente y solicitud: ${error.message}`, {
        stack: error.stack,
        name: error.name,
        sql: error.sql,
        original: error.original
      });
      
      // Propagar el error original para debugging
      const e = new Error(error.message || "Error al guardar los datos en la base de datos.");
      e.status = 500;
      e.details = error.original?.message || error.message;
      e.originalError = error;
      throw e;
    }
  }

  // ============= CREACIÓN DE MÉDICO (SIN SOLICITUD) =============

  /**
   * Crea Usuario (activo) + Médico directamente (sin solicitud)
   */
  async crearUsuarioYMedico({ usuario, medico }) {
    const t = await sequelize.transaction();
    
    try {
      // 1. Crear el usuario (ACTIVO)
      const usuarioCreado = await Usuario.create({
        email: usuario.email,
        password_hash: usuario.password_hash,
        salt: usuario.salt,
        rol: usuario.rol,
        activo: true, // Activo desde el inicio
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      // 2. Crear el médico asociado al usuario
      const medicoCreado = await Medico.create({
        usuario_id: usuarioCreado.id,
        nombres: medico.nombres,
        apellidos: medico.apellidos,
        numero_identificacion: medico.numero_identificacion,
        especialidad: medico.especialidad,
        registro_medico: medico.registro_medico,
        telefono: medico.telefono,
        costo_consulta_presencial: medico.costo_consulta_presencial,
        costo_consulta_virtual: medico.costo_consulta_virtual,
        localidad: medico.localidad,
        disponible: medico.disponible,
        calificacion_promedio: medico.calificacion_promedio || 0.00,
        fecha_registro: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      // 3. Confirmar la transacción
      await t.commit();

      logger.info(`Usuario y médico creados: Usuario ${usuarioCreado.id}, Médico ${medicoCreado.id}`);

      return {
        usuario: usuarioCreado,
        medico: medicoCreado
      };

    } catch (error) {
      await t.rollback();
      logger.error(`Error al crear usuario y médico: ${error.message}`);
      
      const e = new Error("Error al guardar los datos en la base de datos.");
      e.status = 500;
      e.details = error.message;
      throw e;
    }
  }

  // ============= GESTIÓN DE SOLICITUDES =============

  /**
   * Lista solicitudes con joins a paciente y usuario
   */
  async listarSolicitudes({ estado = 'PENDIENTE' }) {
    try {
      const solicitudes = await SolicitudRegistro.findAll({
        where: { estado },
        include: [
          {
            model: Paciente,
            as: 'paciente',
            include: [
              {
                model: Usuario,
                as: 'usuario',
                attributes: ['id', 'email', 'rol', 'activo']
              }
            ]
          },
          {
            model: Usuario,
            as: 'revisador',
            attributes: ['id', 'email', 'rol']
          }
        ],
        order: [['fecha_creacion', 'DESC']]
      });

      return solicitudes;
    } catch (error) {
      logger.error(`Error al listar solicitudes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene una solicitud por ID
   */
  async obtenerSolicitudPorId(solicitudId) {
    try {
      const solicitud = await SolicitudRegistro.findByPk(solicitudId, {
        include: [
          {
            model: Paciente,
            as: 'paciente',
            include: [
              {
                model: Usuario,
                as: 'usuario'
              }
            ]
          }
        ]
      });

      return solicitud;
    } catch (error) {
      logger.error(`Error al obtener solicitud: ${error.message}`);
      throw error;
    }
  }

  /**
   * Aprueba una solicitud y activa el usuario
   */
  async aprobarSolicitudYActivarUsuario({ solicitudId, revisadoPor, motivo_decision }) {
    const t = await sequelize.transaction();
    
    try {
      // 1. Obtener la solicitud con el paciente y usuario
      const solicitud = await SolicitudRegistro.findByPk(solicitudId, {
        include: [{
          model: Paciente,
          as: 'paciente',
          include: [{
            model: Usuario,
            as: 'usuario'
          }]
        }],
        transaction: t
      });

      if (!solicitud) {
        throw new Error("Solicitud no encontrada");
      }

      // 2. Actualizar el estado de la solicitud
      await solicitud.update({
        estado: 'APROBADA',
        revisado_por: revisadoPor,
        motivo_decision: motivo_decision,
        fecha_validacion: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      // 3. Activar el usuario
      await Usuario.update(
        { 
          activo: true,
          fecha_actualizacion: new Date()
        },
        { 
          where: { id: solicitud.paciente.usuario_id },
          transaction: t 
        }
      );

      // 4. Confirmar la transacción
      await t.commit();

      logger.info(`Solicitud aprobada y usuario activado: Solicitud ${solicitudId}`);

      return {
        solicitud,
        usuario_activado: true
      };

    } catch (error) {
      await t.rollback();
      logger.error(`Error al aprobar solicitud: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rechaza una solicitud y elimina el usuario y paciente
   */
  async rechazarSolicitudYEliminarUsuario({ solicitudId, revisadoPor, motivo_decision }) {
    const t = await sequelize.transaction();
    
    try {
      // 1. Obtener la solicitud con el paciente y usuario
      const solicitud = await SolicitudRegistro.findByPk(solicitudId, {
        include: [{
          model: Paciente,
          as: 'paciente',
          include: [{
            model: Usuario,
            as: 'usuario'
          }]
        }],
        transaction: t
      });

      if (!solicitud) {
        throw new Error("Solicitud no encontrada");
      }

      const usuarioId = solicitud.paciente.usuario_id;
      const pacienteId = solicitud.paciente_id;

      // 2. Actualizar el estado de la solicitud (antes de eliminar)
      await solicitud.update({
        estado: 'RECHAZADA',
        revisado_por: revisadoPor,
        motivo_decision: motivo_decision,
        fecha_validacion: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      // 3. Eliminar la solicitud (debe ir primero por las foreign keys)
      await SolicitudRegistro.destroy({
        where: { id: solicitudId },
        transaction: t
      });

      // 4. Eliminar el paciente
      await Paciente.destroy({
        where: { id: pacienteId },
        transaction: t
      });

      // 5. Eliminar el usuario
      await Usuario.destroy({
        where: { id: usuarioId },
        transaction: t
      });

      // 6. Confirmar la transacción
      await t.commit();

      logger.info(`Solicitud rechazada y usuario eliminado: Solicitud ${solicitudId}`);

      return {
        solicitud,
        usuario_eliminado: true,
        paciente_eliminado: true
      };

    } catch (error) {
      await t.rollback();
      logger.error(`Error al rechazar solicitud: ${error.message}`);
      throw error;
    }
  }
}

export default SolicitudRepository;