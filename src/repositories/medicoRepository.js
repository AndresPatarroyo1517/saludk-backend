import { Op } from 'sequelize';
import db from '../models/index.js';

class MedicoRepository {
  constructor() {
    this.Medico = db.Medico;
    this.DisponibilidadMedico = db.DisponibilidadMedico;
    this.Usuario = db.Usuario;
    this.CalificacionMedico = db.CalificacionMedico;
  }

  /**
   * Crea o actualiza la disponibilidad de un médico
   * @param {string} medicoId - UUID del médico
   * @param {Array} disponibilidades - Array de objetos con disponibilidad
   * @returns {Promise<Array>} Disponibilidades creadas/actualizadas
   */
  async configurarDisponibilidad(medicoId, disponibilidades) {
    // Eliminar disponibilidades anteriores
    await this.DisponibilidadMedico.destroy({
      where: { medico_id: medicoId }
    });

    // Crear nuevas disponibilidades
    const disponibilidadesConMedico = disponibilidades.map(disp => ({
      ...disp,
      medico_id: medicoId
    }));

    return await this.DisponibilidadMedico.bulkCreate(disponibilidadesConMedico);
  }

  /**
   * Actualiza una disponibilidad específica
   * @param {string} disponibilidadId - UUID de la disponibilidad
   * @param {Object} datos - Datos a actualizar
   * @returns {Promise<Object>} Disponibilidad actualizada
   */
  async actualizarDisponibilidad(disponibilidadId, datos) {
    const disponibilidad = await this.DisponibilidadMedico.findByPk(disponibilidadId);
    if (!disponibilidad) {
      throw new Error('Disponibilidad no encontrada');
    }
    return await disponibilidad.update(datos);
  }

  /**
   * Elimina una disponibilidad específica
   * @param {string} disponibilidadId - UUID de la disponibilidad
   * @returns {Promise<number>} Número de filas eliminadas
   */
  async eliminarDisponibilidad(disponibilidadId) {
    return await this.DisponibilidadMedico.destroy({
      where: { id: disponibilidadId }
    });
  }

  /**
   * Obtiene la disponibilidad configurada de un médico
   * @param {string} medicoId - UUID del médico
   * @returns {Promise<Array>} Array de disponibilidades
   */
  async obtenerDisponibilidadMedico(medicoId) {
    return await this.DisponibilidadMedico.findAll({
      where: { medico_id: medicoId },
      order: [['dia_semana', 'ASC'], ['hora_inicio', 'ASC']],
      raw: true
    });
  }

  /**
   * Lista médicos disponibles con filtros
   * @param {Object} filtros - Filtros de búsqueda
   * @returns {Promise<Array>} Array de médicos
   */
  async listarMedicosDisponibles(filtros = {}) {
    const {
      especialidad,
      localidad,
      modalidad,
      dia_semana,
      calificacion_minima,
      costo_maximo,
      nombre,
      limit = 50,
      offset = 0
    } = filtros;

    const whereClause = { disponible: true };
    const includeClause = [];

    // Filtro por especialidad
    if (especialidad) {
      whereClause.especialidad = {
        [Op.iLike]: `%${especialidad}%`
      };
    }

    // Filtro por localidad
    if (localidad) {
      whereClause.localidad = {
        [Op.iLike]: `%${localidad}%`
      };
    }

    // Filtro por nombre o apellido
    if (nombre) {
      whereClause[Op.or] = [
        { nombres: { [Op.iLike]: `%${nombre}%` } },
        { apellidos: { [Op.iLike]: `%${nombre}%` } }
      ];
    }

    // Filtro por calificación mínima
    if (calificacion_minima) {
      whereClause.calificacion_promedio = {
        [Op.gte]: calificacion_minima
      };
    }

    // Filtro por costo máximo (considerando ambas modalidades)
    if (costo_maximo) {
      whereClause[Op.or] = [
        { costo_consulta_presencial: { [Op.lte]: costo_maximo } },
        { costo_consulta_virtual: { [Op.lte]: costo_maximo } }
      ];
    }

    // Filtro por modalidad y día de semana en disponibilidad
    if (modalidad || dia_semana !== undefined) {
      const disponibilidadWhere = { disponible: true };
      
      if (modalidad) {
        disponibilidadWhere.modalidad = modalidad;
      }
      
      if (dia_semana !== undefined) {
        disponibilidadWhere.dia_semana = dia_semana;
      }

      includeClause.push({
        model: this.DisponibilidadMedico,
        as: 'disponibilidades',
        where: disponibilidadWhere,
        required: true,
        attributes: ['id', 'dia_semana', 'hora_inicio', 'hora_fin', 'modalidad']
      });
    } else {
      // Si no hay filtro de disponibilidad, incluir todas
      includeClause.push({
        model: this.DisponibilidadMedico,
        as: 'disponibilidades',
        required: false,
        attributes: ['id', 'dia_semana', 'hora_inicio', 'hora_fin', 'modalidad']
      });
    }

    const medicos = await this.Medico.findAll({
      where: whereClause,
      include: includeClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['calificacion_promedio', 'DESC']],
      distinct: true
    });

    return medicos;
  }

  /**
   * Obtiene el detalle completo de un médico
   * @param {string} medicoId - UUID del médico
   * @returns {Promise<Object>} Datos del médico
   */
  async obtenerMedicoPorId(medicoId) {
    return await this.Medico.findOne({
      where: { id: medicoId },
      include: [
        {
          model: this.DisponibilidadMedico,
          as: 'disponibilidades',
          attributes: ['id', 'dia_semana', 'hora_inicio', 'hora_fin', 'modalidad', 'disponible']
        },
        {
          model: this.Usuario,
          as: 'usuario',
          attributes: ['email']
        }
      ]
    });
  }

  /**
   * Cuenta el total de médicos con filtros
   * @param {Object} filtros - Filtros de búsqueda
   * @returns {Promise<number>} Total de médicos
   */
  async contarMedicosDisponibles(filtros = {}) {
    const { especialidad, localidad, calificacion_minima, nombre } = filtros;
    
    const whereClause = { disponible: true };

    if (especialidad) {
      whereClause.especialidad = { [Op.iLike]: `%${especialidad}%` };
    }

    if (localidad) {
      whereClause.localidad = { [Op.iLike]: `%${localidad}%` };
    }

    if (nombre) {
      whereClause[Op.or] = [
        { nombres: { [Op.iLike]: `%${nombre}%` } },
        { apellidos: { [Op.iLike]: `%${nombre}%` } }
      ];
    }

    if (calificacion_minima) {
      whereClause.calificacion_promedio = { [Op.gte]: calificacion_minima };
    }

    return await this.Medico.count({ where: whereClause });
  }

  /**
   * Obtiene las calificaciones de un médico
   * @param {string} medicoId - UUID del médico
   * @param {number} limit - Límite de calificaciones
   * @returns {Promise<Array>} Array de calificaciones
   */
  async obtenerCalificaciones(medicoId, limit = 10) {
    return await this.CalificacionMedico.findAll({
      where: { medico_id: medicoId },
      limit,
      order: [['fecha_creacion', 'DESC']],
      attributes: ['id', 'puntuacion', 'comentario', 'fecha_creacion']
    });
  }

  async actualizarMedico(medicoId, datos) {
    const medico = await this.Medico.findByPk(medicoId, { include: [{ model: this.Usuario, as: 'usuario' }] });
    if (!medico) throw new Error('Médico no encontrado');

    // Campos de médico permitidos
    const camposMedico = {
      nombres: datos.medico?.nombres,
      apellidos: datos.medico?.apellidos,
      numero_identificacion: datos.medico?.numero_identificacion,
      especialidad: datos.medico?.especialidad,
      registro_medico: datos.medico?.registro_medico,
      telefono: datos.medico?.telefono,
      localidad: datos.medico?.localidad,
      disponible: datos.medico?.disponible,
      costo_consulta_presencial: datos.medico?.costo_consulta_presencial,
      costo_consulta_virtual: datos.medico?.costo_consulta_virtual,
    };
    await medico.update(camposMedico);

    // Actualizar usuario si existe
    if (datos.usuario && medico.usuario) {
      const camposUsuario = {};
      if (datos.usuario.email) camposUsuario.email = datos.usuario.email;
      if (datos.usuario.password_hash) camposUsuario.password_hash = datos.usuario.password_hash;
      if (datos.usuario.salt) camposUsuario.salt = datos.usuario.salt;

      if (Object.keys(camposUsuario).length > 0) {
        await medico.usuario.update(camposUsuario);
      }
    }

    return medico;
  }

  async desactivarMedico(medicoId) {
    const medico = await this.Medico.findByPk(medicoId, { include: [{ model: this.Usuario, as: 'usuario' }] });
    if (!medico) throw new Error('Médico no encontrado');

    await medico.update({ disponible: false });

    if (medico.usuario) {
      await medico.usuario.update({
        activo: false,
        fecha_actualizacion: new Date()
      });
    }

    return medico;
  }


}

export default MedicoRepository;