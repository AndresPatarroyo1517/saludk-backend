import db from "../models/index.js";
import logger from "../utils/logger.js";

const { Usuario, Paciente, Medico, SolicitudRegistro, sequelize } = db;

class SolicitudRepository {
  
  async verificarEmailExistente(email) {
    const usuario = await Usuario.findOne({ 
      where: { email: email.toLowerCase() } 
    });
    return !!usuario;
  }

  async verificarIdentificacionPacienteExistente(numero_identificacion) {
    const paciente = await Paciente.findOne({ 
      where: { numero_identificacion } 
    });
    return !!paciente;
  }

  async verificarIdentificacionMedicoExistente(numero_identificacion) {
    const medico = await Medico.findOne({ 
      where: { numero_identificacion } 
    });
    return !!medico;
  }

  async verificarRegistroMedicoExistente(registro_medico) {
    const medico = await Medico.findOne({ 
      where: { registro_medico } 
    });
    return !!medico;
  }

  async crearUsuarioPacienteYSolicitud({ usuario, paciente }) {
    const t = await sequelize.transaction();
    
    try {
      const usuarioCreado = await Usuario.create({
        ...usuario,
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      const pacienteCreado = await Paciente.create({
        usuario_id: usuarioCreado.id,
        ...paciente,
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      const solicitudCreada = await SolicitudRegistro.create({
        paciente_id: pacienteCreado.id,
        estado: 'PENDIENTE',
        resultados_bd_externas: {},
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      await t.commit();
      logger.info(`Usuario, paciente y solicitud creados: ${usuarioCreado.id}`);

      return {
        usuario: usuarioCreado,
        paciente: pacienteCreado,
        solicitud: solicitudCreada
      };
    } catch (error) {
      await t.rollback();
      logger.error(`Error al crear usuario, paciente y solicitud: ${error.message}`);
      throw error;
    }
  }

  async crearUsuarioYMedico({ usuario, medico }) {
    const t = await sequelize.transaction();
    
    try {
      const usuarioCreado = await Usuario.create({
        ...usuario,
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      const medicoCreado = await Medico.create({
        usuario_id: usuarioCreado.id,
        ...medico,
        fecha_registro: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      await t.commit();
      logger.info(`Usuario y médico creados: ${usuarioCreado.id}`);

      return {
        usuario: usuarioCreado,
        medico: medicoCreado
      };
    } catch (error) {
      await t.rollback();
      logger.error(`Error al crear usuario y médico: ${error.message}`);
      throw error;
    }
  }

  async listarSolicitudes({ estado = 'PENDIENTE' }) {
    return await SolicitudRegistro.findAll({
      where: { estado },
      include: [
        {
          model: Paciente,
          as: 'paciente',
          include: [{
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'email', 'rol', 'activo']
          }]
        },
        {
          model: Usuario,
          as: 'revisador',
          attributes: ['id', 'email', 'rol']
        }
      ],
      order: [['fecha_creacion', 'DESC']]
    });
  }

  async obtenerSolicitudPorId(solicitudId) {
    return await SolicitudRegistro.findByPk(solicitudId, {
      include: [{
        model: Paciente,
        as: 'paciente',
        include: [{
          model: Usuario,
          as: 'usuario'
        }]
      }]
    });
  }

  async aprobarSolicitudYActivarUsuario({ solicitudId, revisadoPor, motivo_decision }) {
    const t = await sequelize.transaction();
    
    try {
      const solicitud = await SolicitudRegistro.findByPk(solicitudId, {
        include: [{
          model: Paciente,
          as: 'paciente',
          include: [{ model: Usuario, as: 'usuario' }]
        }],
        transaction: t
      });

      await solicitud.update({
        estado: 'APROBADA',
        revisado_por: revisadoPor,
        motivo_decision,
        fecha_validacion: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      await Usuario.update(
        { activo: true, fecha_actualizacion: new Date() },
        { where: { id: solicitud.paciente.usuario_id }, transaction: t }
      );

      await t.commit();
      logger.info(`Solicitud aprobada: ${solicitudId}`);

      return { solicitud, usuario_activado: true };
    } catch (error) {
      await t.rollback();
      logger.error(`Error al aprobar solicitud: ${error.message}`);
      throw error;
    }
  }

  async rechazarSolicitudYEliminarUsuario({ solicitudId, revisadoPor, motivo_decision }) {
    const t = await sequelize.transaction();
    
    try {
      const solicitud = await SolicitudRegistro.findByPk(solicitudId, {
        include: [{
          model: Paciente,
          as: 'paciente',
          include: [{ model: Usuario, as: 'usuario' }]
        }],
        transaction: t
      });

      const usuarioId = solicitud.paciente.usuario_id;
      const pacienteId = solicitud.paciente_id;

      await solicitud.update({
        estado: 'RECHAZADA',
        revisado_por: revisadoPor,
        motivo_decision,
        fecha_validacion: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      await SolicitudRegistro.destroy({ where: { id: solicitudId }, transaction: t });
      await Paciente.destroy({ where: { id: pacienteId }, transaction: t });
      await Usuario.destroy({ where: { id: usuarioId }, transaction: t });

      await t.commit();
      logger.info(`Solicitud rechazada: ${solicitudId}`);

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