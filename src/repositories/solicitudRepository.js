import db from "../models/index.js";
import logger from "../utils/logger.js";
import { Op } from "sequelize";

const { Usuario, Paciente, Medico, SolicitudRegistro, ResultadoValidacion, Direccion, sequelize } = db;

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

  async crearUsuarioPacienteYSolicitud({ usuario, paciente, direccion }) {
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

      const direccionCreada = await Direccion.create({
      paciente_id: pacienteCreado.id,
      ...direccion,
      fecha_creacion: new Date()
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
        direccion: direccionCreada,
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

  async listarSolicitudes({ estado }) {
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

  async listarSolicitudesPendientesConErrores() {
    // PENDIENTE y resultados_bd_externas.errores != null
    return await SolicitudRegistro.findAll({
      where: {
        estado: 'PENDIENTE',
        resultados_bd_externas: {
          [Op.contains]: {errores: {}}
        }
      },
      include: [
        {
          model: Paciente,
          as: 'paciente',
          include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'email', 'rol', 'activo'] }]
        },
        { model: ResultadoValidacion, as: 'validaciones' }
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

      if (!solicitud) {
        throw new Error('Solicitud no encontrada');
      }

      // 1. Marcar solicitud como RECHAZADA (NO borrar)
      await solicitud.update({
        estado: 'RECHAZADA',
        revisado_por: revisadoPor,
        motivo_decision,
        fecha_validacion: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      // 2. Desactivar usuario (NO borrar)
      await Usuario.update(
        {
          activo: false,
          fecha_actualizacion: new Date()
        },
        {
          where: { id: solicitud.paciente.usuario_id },
          transaction: t
        }
      );

      // 3. Marcar documentos como RECHAZADOS (NO borrar)
      await Documento.update(
        { estado: 'RECHAZADO' },
        {
          where: { solicitud_id: solicitudId },
          transaction: t
        }
      );

      await t.commit();
      logger.info(`Solicitud rechazada: ${solicitudId}`);

      return {
        solicitud,
        usuario_desactivado: true,
        mensaje: 'Solicitud rechazada. Los datos se conservan para auditoría.'
      };
    } catch (error) {
      await t.rollback();
      logger.error(`Error al rechazar solicitud: ${error.message}`);
      throw error;
    }
  }

  // QUITAR DEL REGISTRO LOS METODOS DE ARRIBA AHORA SE ACTIVA O ELIMINA DESDE LA VALIDACIÓN QUE HACE EL DIRECTOR
  // ==========================================================
  // APROBAR / RECHAZAR / DEVOLVER usando resultado_validacion 
  // ==========================================================
  async aprobarSolicitudYActivarUsuarioPorResultadoValidacion({ resultadoValidacionId, revisadoPor, motivo_decision }) {
    const t = await sequelize.transaction();
    try {
      const rv = await ResultadoValidacion.findByPk(resultadoValidacionId, {
        include: [{
          model: SolicitudRegistro, as: 'solicitud',
          include: [{ model: Paciente, as: 'paciente', include: [{ model: Usuario, as: 'usuario' }] }]
        }],
        transaction: t
      });
      if (!rv) throw new Error('resultado_validacion no encontrado');
      if (rv.resultado !== true) throw new Error('El resultado_validacion no es aprobatorio');

      const solicitud = rv.solicitud;
      if (!solicitud) throw new Error('Solicitud asociada no encontrada');

      await solicitud.update({
        estado: 'APROBADA', // aseguramos estado APROBADA si no lo estaba
        revisado_por: revisadoPor ?? solicitud.revisado_por,
        motivo_decision: motivo_decision || 'Aprobada por Director Médico',
        fecha_validacion: new Date(), //  actualiza la fecha
        fecha_actualizacion: new Date()
      }, { transaction: t });

      await Usuario.update(
        { activo: true, fecha_actualizacion: new Date() },
        { where: { id: solicitud.paciente.usuario_id }, transaction: t }
      );

      await t.commit();
      logger.info({ msg: 'Solicitud aprobada por resultado_validacion', resultadoValidacionId, solicitudId: solicitud.id });
      return { solicitud, usuario_activado: true };
    } catch (error) {
      await t.rollback();
      logger.error({ msg: 'Error al aprobar por resultado_validacion', error: error.message });
      throw error;
    }
  }

   async rechazarSolicitudYEliminarUsuarioPorResultadoValidacion({ resultadoValidacionId, revisadoPor, motivo_decision }) {
    if (!motivo_decision) {
      const e = new Error('El motivo es obligatorio para RECHAZAR');
      e.status = 400;
      throw e;
    }

    const t = await sequelize.transaction();
    try {
      const rv = await ResultadoValidacion.findByPk(resultadoValidacionId, {
        include: [{
          model: SolicitudRegistro,
          as: 'solicitud',
          include: [{
            model: Paciente,
            as: 'paciente',
            include: [{ model: Usuario, as: 'usuario' }]
          }]
        }],
        transaction: t
      });

      if (!rv) throw new Error('resultado_validacion no encontrado');
      if (rv.resultado !== false) throw new Error('El resultado_validacion no es de rechazo');

      const solicitud = rv.solicitud;
      if (!solicitud) throw new Error('Solicitud asociada no encontrada');

      // 1. Marcar solicitud como RECHAZADA (NO borrar, mantener para auditoría)
      await solicitud.update({
        estado: 'RECHAZADA',
        revisado_por: revisadoPor ?? solicitud.revisado_por,
        motivo_decision,
        fecha_validacion: new Date(),
        fecha_actualizacion: new Date()
      }, { transaction: t });

      // 2. Desactivar usuario (NO eliminar, mantener para trazabilidad)
      await Usuario.update(
        {
          activo: false,
          fecha_actualizacion: new Date()
        },
        {
          where: { id: solicitud.paciente.usuario_id },
          transaction: t
        }
      );

      // 3. Marcar documentos como RECHAZADOS (NO borrar)
      await Documento.update(
        { estado: 'RECHAZADO' },
        {
          where: { solicitud_id: solicitud.id },
          transaction: t
        }
      );

      await t.commit();
      logger.info({
        msg: 'Solicitud rechazada y usuario desactivado por resultado_validacion',
        resultadoValidacionId,
        solicitudId: solicitud.id
      });

      return {
        solicitud,
        usuario_desactivado: true,
        mensaje: 'Solicitud rechazada. Los datos se conservan para auditoría.'
      };
    } catch (error) {
      await t.rollback();
      logger.error({
        msg: 'Error al rechazar por resultado_validacion',
        error: error.message
      });
      throw error;
    }
  }

  async devolverSolicitudPorResultadoValidacion({ resultadoValidacionId, revisadoPor, motivo_decision }) {
    if (!motivo_decision) {
      const e = new Error('El motivo es obligatorio para DEVOLVER');
      e.status = 400; throw e;
    }
    const t = await sequelize.transaction();
    try {
      const rv = await ResultadoValidacion.findByPk(resultadoValidacionId, {
        include: [{ model: SolicitudRegistro, as: 'solicitud' }],
        transaction: t
      });
      if (!rv) throw new Error('resultado_validacion no encontrado');

      const solicitud = rv.solicitud;
      if (!solicitud) throw new Error('Solicitud asociada no encontrada');

      // DEVOLVER: se deja en PENDIENTE con motivo y se ACTUALIZA la fecha
      await solicitud.update({
        estado: 'PENDIENTE',
        revisado_por: revisadoPor ?? solicitud.revisado_por,
        motivo_decision,
        fecha_validacion: new Date(), // actualiza la fecha (tu petición)
        fecha_actualizacion: new Date()
      }, { transaction: t });

      await t.commit();
      logger.info({ msg: 'Solicitud devuelta por resultado_validacion', resultadoValidacionId, solicitudId: solicitud.id });
      return { solicitud };
    } catch (error) {
      await t.rollback();
      logger.error({ msg: 'Error al devolver por resultado_validacion', error: error.message });
      throw error;
    }
  }

  async countByRange(
    { from, to },
    opts = { dateField: 'fecha_creacion', estados: undefined, reviewed: undefined }
  ) {
    const dateField = opts?.dateField ?? 'fecha_creacion';

    const total = await SolicitudRegistro.count({
      where: {
        [dateField]: { [Op.between]: [from, to] },
        ...(opts?.estados?.length ? { estado: { [Op.in]: opts.estados } } : {}),
        ...(opts?.reviewed === true ? { revisado_por: { [Op.ne]: null } } : {}),
        ...(opts?.reviewed === false ? { revisado_por: null } : {})
      }
    });

    return total;
  };

  async verificarDocumentoPorHash(hash) {
    const documento = await Documento.findOne({
      where: { hash_sha256: hash }
    });
    return !!documento;
  }

  async crearDocumento(datosDocumento) {
    return await Documento.create({
      ...datosDocumento,
      fecha_carga: new Date()
    });
  }

  async obtenerDocumentosPorSolicitud(solicitudId) {
    return await Documento.findAll({
      where: { solicitud_id: solicitudId },
      order: [['fecha_carga', 'DESC']]
    });
  }
}

export default SolicitudRepository;