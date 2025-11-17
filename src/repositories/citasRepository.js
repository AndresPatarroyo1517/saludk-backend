// repositories/citaRepository.js
import { Op } from 'sequelize';
import db from '../models/index.js';

class CitaRepository {
  constructor() {
    this.DisponibilidadMedico = db.DisponibilidadMedico;
    this.Cita = db.Cita;
    this.Medico = db.Medico;
    this.Paciente = db.Paciente;
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
  async obtenerCitasAgendadas(medicoId, fechaInicio, fechaFin, estados = ['AGENDADA', 'CONFIRMADA'], duracionMinutos = 30) {
    // Normalizar rango: cubrir desde inicio del día de fechaInicio
    // hasta fin del día de fechaFin y añadir un margen por la duración
    // para capturar citas que empiecen ligeramente fuera del rango pero
    // que se solapen con los slots.
    const inicio = new Date(fechaInicio);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fechaFin);
    fin.setHours(23, 59, 59, 999);

    // Añadir margen por duración en milisegundos
    const margen = (duracionMinutos || 30) * 60 * 1000;
    const inicioConMargen = new Date(inicio.getTime() - margen);
    const finConMargen = new Date(fin.getTime() + margen);

    return await this.Cita.findAll({
      where: {
        medico_id: medicoId,
        fecha_hora: {
          [Op.between]: [inicioConMargen, finConMargen]
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
  async verificarConflictoHorario(medicoId, fechaHora, duracionMinutos = 30, excludeCitaId = null) {
    const fechaInicio = new Date(fechaHora);
    const fechaFin = new Date(fechaHora.getTime() + duracionMinutos * 60000);

    // Buscar cualquier cita que se solape con la ventana [fechaInicio, fechaFin]
    // Si se proporciona excludeCitaId, excluir esa cita (útil al editar)
    const whereClause = {
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
    };

    if (excludeCitaId) {
      whereClause.id = { [Op.ne]: excludeCitaId };
    }

    const citaConflicto = await this.Cita.findOne({ where: whereClause });

    return citaConflicto !== null;
  }

  /**
   * Obtiene un médico por ID con validación
   */
  async obtenerMedicoPorId(medicoId) {
    return await this.Medico.findByPk(medicoId);
  }

  /**
   * Obtiene todas las citas de un paciente con filtros opcionales
   */
  async obtenerCitasPaciente(pacienteId, estado = null, fechaDesde = null, fechaHasta = null, modalidad = null, ordenarPor = 'fecha_hora') {
    const whereClause = { paciente_id: pacienteId };

    // Filtro por estado
    if (estado) {
      whereClause.estado = estado;
    }

    // Filtro por rango de fechas
    if (fechaDesde || fechaHasta) {
      whereClause.fecha_hora = {};
      if (fechaDesde) {
        whereClause.fecha_hora[Op.gte] = new Date(fechaDesde);
      }
      if (fechaHasta) {
        whereClause.fecha_hora[Op.lte] = new Date(fechaHasta);
      }
    }

    // Filtro por modalidad
    if (modalidad) {
      whereClause.modalidad = modalidad.toUpperCase();
    }

    // Definir orden
    let order = [['fecha_hora', 'DESC']];
    if (ordenarPor === 'fecha_hora_asc') {
      order = [['fecha_hora', 'ASC']];
    } else if (ordenarPor === 'estado') {
      order = [['estado', 'ASC'], ['fecha_hora', 'DESC']];
    }

    const citas = await this.Cita.findAll({
      where: whereClause,
      include: [
        {
          association: 'medico',
          attributes: ['id', 'nombres', 'apellidos', 'especialidad', 'calificacion_promedio']
        }
      ],
      order,
      raw: false
    });

    return citas;
  }

  /**
   * Obtiene todas las citas de un medico con rango de fechas
   */
  async obtenerCitasMedico(medicoId, rango = null, ordenarPor = 'fecha_hora') {
    const whereClause = {
      medico_id: medicoId,
      estado: 'AGENDADA'
    };

    const today = new Date();
    let start = null;
    let end = null;

    if (rango === 'hoy') {
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    }

    if (rango === 'semana') {
      start = new Date(today);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);

      end = new Date(start);
      end.setDate(end.getDate() + 7);
    }

    if (rango === 'mes') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    }

    if (start && end) {
      whereClause.fecha_hora = {
        [Op.gte]: start,
        [Op.lte]: end
      };
    }

    let order = [['fecha_hora', 'DESC']];
    if (ordenarPor === 'fecha_hora_asc') {
      order = [['fecha_hora', 'ASC']];
    }

    const citas = await this.Cita.findAll({
      where: whereClause,
      include: [
        {
          association: 'paciente',
          attributes: ['id', 'nombres', 'apellidos']
        }
      ],
      order,
      raw: false
    });

    return citas;
  }

  /**
   * Obtiene una cita por su ID
   */
  async obtenerCitaPorId(citaId) {
    return await this.Cita.findByPk(citaId, {
      include: [
        {
          association: 'medico',
          attributes: ['id', 'nombres', 'apellidos', 'especialidad']
        }
      ]
    });
  }

  /**
   * Actualiza una cita existente y retorna los datos completos
   */
  async actualizarCita(citaId, datosActualizados) {
    const cita = await this.Cita.findByPk(citaId);

    if (!cita) {
      throw new Error('Cita no encontrada');
    }

    // Actualizar la cita
    await cita.update(datosActualizados);

    // Retornar la cita actualizada con todos los campos
    const citaActualizada = await this.Cita.findByPk(citaId, {
      include: [
        { model: db.Medico, as: 'medico', attributes: ['id', 'nombres', 'apellidos', 'especialidad'] },
        { model: db.Paciente, as: 'paciente', attributes: ['id', 'nombres', 'apellidos', 'email'] }
      ]
    });

    return citaActualizada.toJSON ? citaActualizada.toJSON() : citaActualizada;
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

  async obtenerEstadisticasCitasMedico(medicoId) {
    const today = new Date();

    const inicioHoy = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const finHoy = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1);
    const finMes = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Total citas AGENDADAS hoy
    const totalHoy = await this.Cita.count({
      where: {
        medico_id: medicoId,
        estado: 'AGENDADA',
        fecha_hora: {
          [Op.gte]: inicioHoy,
          [Op.lt]: finHoy
        }
      }
    });

    // Total COMPLETADAS este mes
    const totalMesCompletadas = await this.Cita.count({
      where: {
        medico_id: medicoId,
        estado: 'COMPLETADA',
        fecha_hora: {
          [Op.gte]: inicioMes,
          [Op.lt]: finMes
        }
      }
    });

    // Próximas citas de hoy (lista detallada)
    const proximas = await this.Cita.findAll({
      where: {
        medico_id: medicoId,
        estado: 'AGENDADA',
        fecha_hora: {
          [Op.gte]: inicioHoy,
          [Op.lt]: finHoy
        }
      },
      include: [
        {
          model: this.Paciente,
          as: 'paciente',
          attributes: ['id', 'nombres', 'apellidos']
        }
      ],
      order: [['fecha_hora', 'ASC']]
    });

    return {
      total_hoy: totalHoy,
      total_mes_completadas: totalMesCompletadas,
      proximas_citas_hoy: proximas
    };
  }

}

export default CitaRepository;