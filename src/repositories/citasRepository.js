// repositories/citaRepository.js
import { Op } from 'sequelize';
import db from '../models/index.js';

class CitaRepository {
  constructor() {
    this.DisponibilidadMedico = db.DisponibilidadMedico;
    this.Cita = db.Cita;
    this.Medico = db.Medico;
  }

  /**
   * Obtiene la disponibilidad configurada de un médico
   */
  async obtenerDisponibilidadPorMedico(medicoId, modalidad = null) {
    const whereClause = {
      medico_id: medicoId,
      disponible: true
    };

    if (modalidad) {
      whereClause.modalidad = modalidad;
    }

    const disponibilidades = await this.DisponibilidadMedico.findAll({
      where: whereClause,
      order: [['dia_semana', 'ASC'], ['hora_inicio', 'ASC']],
      raw: true
    });

    return disponibilidades.map(disp => ({
      ...disp,
      dia_semana: Number(disp.dia_semana),
      hora_inicio: String(disp.hora_inicio),
      hora_fin: String(disp.hora_fin)
    }));
  }

  /**
   * Obtiene las citas agendadas de un médico en un rango de fechas
   */
  async obtenerCitasAgendadas(medicoId, fechaInicio, fechaFin, estados = ['AGENDADA', 'CONFIRMADA']) {
    return await this.Cita.findAll({
      where: {
        medico_id: medicoId,
        fecha_hora: {
          [Op.between]: [fechaInicio, fechaFin]
        },
        estado: {
          [Op.in]: estados
        }
      },
      order: [['fecha_hora', 'ASC']],
      raw: true
    });
  }

  /**
   * Verifica si existe conflicto de horario para una nueva cita
   * CORREGIDO: Ahora considera toda la ventana de tiempo, no solo el punto de inicio
   */
  async verificarConflictoHorario(medicoId, fechaHora, duracionMinutos = 30) {
    const fechaInicio = new Date(fechaHora);
    const fechaFin = new Date(fechaHora.getTime() + duracionMinutos * 60000);

    // Buscar cualquier cita que se solape con la ventana [fechaInicio, fechaFin]
    // Una cita se solapa si:
    // - Su inicio está dentro de nuestra ventana
    // - O nuestro inicio está dentro de su ventana (asumiendo duración estándar)
    const citaConflicto = await this.Cita.findOne({
      where: {
        medico_id: medicoId,
        estado: {
          [Op.in]: ['AGENDADA', 'CONFIRMADA']
        },
        fecha_hora: {
          // Buscar citas que comienzan en el rango ampliado
          [Op.between]: [
            new Date(fechaInicio.getTime() - duracionMinutos * 60000),
            fechaFin
          ]
        }
      }
    });

    return citaConflicto !== null;
  }

  /**
   * Obtiene un médico por ID con validación
   */
  async obtenerMedicoPorId(medicoId) {
    return await this.Medico.findByPk(medicoId);
  }

  /**
   * Crea una nueva cita en la base de datos
   * AGREGADO: Método que faltaba
   */
  async crearCita(datosCita, transaction = null) {
    const {
      paciente_id,
      medico_id,
      fecha_hora,
      modalidad,
      estado = 'AGENDADA',
      motivo_consulta = null,
      enlace_virtual = null,
      costo_pagado = null
    } = datosCita;

    const options = {};
    if (transaction) options.transaction = transaction;

    const citaCreada = await this.Cita.create({
      paciente_id,
      medico_id,
      fecha_hora: new Date(fecha_hora),
      modalidad,
      estado,
      motivo_consulta,
      enlace_virtual,
      costo_pagado
    }, options);

    return citaCreada.toJSON ? citaCreada.toJSON() : citaCreada;
  }
}

export default CitaRepository;