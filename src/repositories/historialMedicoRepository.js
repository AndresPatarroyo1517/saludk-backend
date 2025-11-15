import db from '../models/index.js';

const { HistorialMedico, Paciente, Cita, Medico, ResultadoConsulta, Receta, Examen } = db;

class HistorialMedicoRepository {
  /**
   * Verifica si un médico tiene autorización para acceder al historial de un paciente
   * @param {string} medicoId - UUID del médico
   * @param {string} pacienteId - UUID del paciente
   * @returns {Promise<boolean>}
   */
  async verificarAutorizacion(medicoId, pacienteId) {
    const cita = await Cita.findOne({
      where: {
        medico_id: medicoId,
        paciente_id: pacienteId
      }
    });
    
    return !!cita;
  }

  /**
   * Obtiene el historial médico de un paciente con toda su información relacionada
   * @param {string} pacienteId - UUID del paciente
   * @returns {Promise<Object|null>}
   */
  async obtenerHistorialCompleto(pacienteId) {
    return await HistorialMedico.findOne({
      where: { paciente_id: pacienteId },
      include: [
        {
          model: Paciente,
          as: 'paciente',
          attributes: ['id', 'nombres', 'apellidos', 'numero_identificacion', 'tipo_sangre', 'alergias', 'fecha_nacimiento', 'genero']
        },
        {
          model: ResultadoConsulta,
          as: 'resultados_consultas',
          order: [['fecha_registro', 'DESC']],
          limit: 10
        },
        {
          model: Receta,
          as: 'recetas',
          where: { 
            fecha_vencimiento: {
              [db.Sequelize.Op.gte]: new Date()
            }
          },
          required: false,
          order: [['fecha_creacion', 'DESC']]
        },
        {
          model: Examen,
          as: 'examenes',
          order: [['fecha_realizacion', 'DESC']],
          limit: 20
        }
      ]
    });
  }

  /**
   * Obtiene solo el historial base sin relaciones profundas
   * @param {string} pacienteId - UUID del paciente
   * @returns {Promise<Object|null>}
   */
  async obtenerHistorialBase(pacienteId) {
    return await HistorialMedico.findOne({
      where: { paciente_id: pacienteId }
    });
  }

  /**
   * Crea un nuevo historial médico
   * @param {Object} data - Datos del historial
   * @returns {Promise<Object>}
   */
  async crear(data) {
    return await HistorialMedico.create(data);
  }

  /**
   * Actualiza un historial médico existente
   * @param {string} historialId - UUID del historial
   * @param {Object} data - Datos a actualizar
   * @returns {Promise<[number, Object[]]>}
   */
  async actualizar(historialId, data) {
    const actualizacion = {
      ...data,
      fecha_actualizacion: new Date()
    };

    return await HistorialMedico.update(actualizacion, {
      where: { id: historialId },
      returning: true
    });
  }

  /**
   * Realiza un upsert (create or update) del historial médico
   * @param {string} pacienteId - UUID del paciente
   * @param {Object} data - Datos del historial
   * @returns {Promise<Object>}
   */
  async upsert(pacienteId, data) {
    const historialExistente = await this.obtenerHistorialBase(pacienteId);
    
    if (historialExistente) {
      const [, historialActualizado] = await this.actualizar(historialExistente.id, data);
      return historialActualizado[0];
    } else {
      return await this.crear({
        paciente_id: pacienteId,
        ...data
      });
    }
  }

  /**
   * Obtiene los pacientes de un médico con sus historiales
   * @param {string} medicoId - UUID del médico
   * @returns {Promise<Object[]>}
   */
  async obtenerPacientesConHistorial(medicoId) {
    const citas = await Cita.findAll({
      where: { medico_id: medicoId },
      attributes: ['paciente_id'],
      group: ['paciente_id'],
      raw: true
    });

    const pacienteIds = citas.map(c => c.paciente_id);

    return await Paciente.findAll({
      where: {
        id: {
          [db.Sequelize.Op.in]: pacienteIds
        }
      },
      include: [
        {
          model: HistorialMedico,
          as: 'historial_medico',
          required: false
        }
      ],
      attributes: ['id', 'nombres', 'apellidos', 'numero_identificacion', 'tipo_sangre', 'fecha_nacimiento']
    });
  }
}

export default new HistorialMedicoRepository();