import CitaService from '../services/citasService.js';

class CitaController {
  constructor() {
    this.service = new CitaService();
  }

  /**
   * GET /api/medicos/:medicoId/disponibilidad
   * Obtiene la disponibilidad de un médico
   */
  obtenerDisponibilidad = async (req, res) => {
    try {
      const { medicoId } = req.params;
      const { 
        fecha_inicio, 
        fecha_fin, 
        modalidad,
        duracion_cita 
      } = req.query;

      // Validaciones
      if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({
          error: 'Los parámetros fecha_inicio y fecha_fin son requeridos',
          ejemplo: '?fecha_inicio=2025-11-10&fecha_fin=2025-11-17'
        });
      }

      const fechaInicio = new Date(fecha_inicio);
      const fechaFin = new Date(fecha_fin);

      // Validar fechas válidas
      if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        return res.status(400).json({
          error: 'Formato de fecha inválido. Use formato ISO: YYYY-MM-DD'
        });
      }

      // Validar que fecha_fin sea mayor a fecha_inicio
      if (fechaFin < fechaInicio) {
        return res.status(400).json({
          error: 'La fecha_fin debe ser posterior a fecha_inicio'
        });
      }

      // Validar rango máximo (por ejemplo, 30 días)
      const diferenciaDias = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24));
      if (diferenciaDias > 30) {
        return res.status(400).json({
          error: 'El rango máximo permitido es de 30 días'
        });
      }

      // Validar modalidad si se proporciona
      if (modalidad && !['PRESENCIAL', 'VIRTUAL'].includes(modalidad.toUpperCase())) {
        return res.status(400).json({
          error: 'Modalidad inválida. Valores permitidos: PRESENCIAL, VIRTUAL'
        });
      }

      const duracionCita = duracion_cita ? parseInt(duracion_cita) : 30;

      if (isNaN(duracionCita) || duracionCita <= 0 || duracionCita > 240) {
        return res.status(400).json({
          error: 'Duración de cita inválida. Debe ser entre 1 y 240 minutos'
        });
      }

      const disponibilidad = await this.service.obtenerDisponibilidad(
        medicoId,
        fechaInicio,
        fechaFin,
        modalidad ? modalidad.toUpperCase() : null,
        duracionCita
      );

      res.status(200).json({
        success: true,
        data: disponibilidad
      });

    } catch (error) {
      console.error('Error al obtener disponibilidad:', error);
      
      if (error.message === 'Médico no encontrado') {
        return res.status(404).json({
          error: 'Médico no encontrado'
        });
      }

      res.status(500).json({
        error: 'Error al obtener disponibilidad del médico',
        mensaje: error.message
      });
    }
  };

  /**
   * POST /api/medicos/:medicoId/disponibilidad/validar
   * Valida si un slot específico está disponible
   */
  validarSlot = async (req, res) => {
    try {
      const { medicoId } = req.params;
      const { fecha_hora, duracion_minutos } = req.body;

      // Validaciones
      if (!fecha_hora) {
        return res.status(400).json({
          error: 'El parámetro fecha_hora es requerido'
        });
      }

      const fechaHora = new Date(fecha_hora);
      if (isNaN(fechaHora.getTime())) {
        return res.status(400).json({
          error: 'Formato de fecha_hora inválido. Use formato ISO: YYYY-MM-DDTHH:mm:ss'
        });
      }

      const duracion = duracion_minutos ? parseInt(duracion_minutos) : 30;

      const validacion = await this.service.validarSlotDisponible(
        medicoId,
        fechaHora,
        duracion
      );

      res.status(200).json({
        success: true,
        data: validacion
      });

    } catch (error) {
      console.error('Error al validar slot:', error);
      res.status(500).json({
        error: 'Error al validar disponibilidad',
        mensaje: error.message
      });
    }
  };

  /**
   * GET /api/medicos/:medicoId/disponibilidad/proximos-slots
   * Obtiene los próximos N slots disponibles
   */
  obtenerProximosSlots = async (req, res) => {
    try {
      const { medicoId } = req.params;
      const { cantidad = 10, modalidad } = req.query;

      const cantidadSlots = parseInt(cantidad);
      if (isNaN(cantidadSlots) || cantidadSlots <= 0 || cantidadSlots > 50) {
        return res.status(400).json({
          error: 'La cantidad debe ser entre 1 y 50'
        });
      }

      // Obtener disponibilidad para los próximos 30 días
      const fechaInicio = new Date();
      const fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + 30);

      const disponibilidad = await this.service.obtenerDisponibilidad(
        medicoId,
        fechaInicio,
        fechaFin,
        modalidad ? modalidad.toUpperCase() : null,
        30
      );

      // Filtrar solo slots disponibles y limitar cantidad
      const slotsDisponibles = disponibilidad.disponibilidad
        .filter(slot => slot.disponible)
        .slice(0, cantidadSlots);

      res.status(200).json({
        success: true,
        data: {
          medico_id: medicoId,
          cantidad_solicitada: cantidadSlots,
          cantidad_encontrada: slotsDisponibles.length,
          slots: slotsDisponibles
        }
      });

    } catch (error) {
      console.error('Error al obtener próximos slots:', error);
      
      if (error.message === 'Médico no encontrado') {
        return res.status(404).json({
          error: 'Médico no encontrado'
        });
      }

      res.status(500).json({
        error: 'Error al obtener próximos slots',
        mensaje: error.message
      });
    }
  };

  /**
   * POST /api/citas
   * Crea una nueva cita
   */
  crearCita = async (req, res) => {
    try {
      const {
        medico_id,
        paciente_id,
        fecha_hora,
        modalidad,
        motivo_consulta,
        duracion_minutos
      } = req.body;

      // Validaciones básicas
      if (!medico_id) {
        return res.status(400).json({ error: 'El campo medico_id es requerido' });
      }

      if (!paciente_id) {
        return res.status(400).json({ error: 'El campo paciente_id es requerido' });
      }

      if (!fecha_hora) {
        return res.status(400).json({ error: 'El campo fecha_hora es requerido' });
      }

      if (!modalidad) {
        return res.status(400).json({ error: 'El campo modalidad es requerido' });
      }

      const cita = await this.service.crearCita({
        medico_id,
        paciente_id,
        fecha_hora,
        modalidad,
        motivo_consulta,
        duracion_minutos
      });

      res.status(201).json({
        success: true,
        mensaje: 'Cita creada exitosamente',
        data: cita
      });

    } catch (error) {
      console.error('Error al crear cita:', error);

      if (error.message.includes('no encontrado')) {
        return res.status(404).json({ error: error.message });
      }

      if (error.message.includes('No se puede agendar') || 
          error.message.includes('requerido') ||
          error.message.includes('debe ser')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({
        error: 'Error al crear la cita',
        mensaje: error.message
      });
    }
  };

  /**
   * GET /citas/paciente/:pacienteId
   * Obtiene todas las citas de un paciente con filtros opcionales
   */
  obtenerCitasPaciente = async (req, res) => {
    try {
      const { pacienteId } = req.params;
      const { estado, fecha_desde, fecha_hasta, modalidad, ordenar_por } = req.query;

      if (!pacienteId) {
        return res.status(400).json({
          error: 'El parámetro pacienteId es requerido'
        });
      }

      const filtros = {
        estado: estado || null,
        fecha_desde: fecha_desde || null,
        fecha_hasta: fecha_hasta || null,
        modalidad: modalidad || null,
        ordenar_por: ordenar_por || 'fecha_hora'
      };

      const citas = await this.service.obtenerCitasPaciente(pacienteId, filtros);

      res.status(200).json({
        success: true,
        data: {
          paciente_id: pacienteId,
          total_citas: citas.length,
          citas
        }
      });

    } catch (error) {
      console.error('Error al obtener citas del paciente:', error);
      res.status(500).json({
        error: 'Error al obtener las citas del paciente',
        mensaje: error.message
      });
    }
  };

  /**
   * DELETE /citas/:citaId/cancelar
   * Cancela una cita (solo si está en estado AGENDADA o CONFIRMADA)
   */
  cancelarCita = async (req, res) => {
    try {
      const { citaId } = req.params;
      const { motivo_cancelacion } = req.body;

      if (!citaId) {
        return res.status(400).json({
          error: 'El parámetro citaId es requerido'
        });
      }

      const citaCancelada = await this.service.cancelarCita(citaId, motivo_cancelacion);

      res.status(200).json({
        success: true,
        mensaje: 'Cita cancelada exitosamente',
        data: citaCancelada
      });

    } catch (error) {
      console.error('Error al cancelar cita:', error);

      if (error.message === 'Cita no encontrada') {
        return res.status(404).json({
          error: error.message
        });
      }

      if (error.message.includes('No se puede cancelar')) {
        return res.status(400).json({
          error: error.message
        });
      }

      res.status(500).json({
        error: 'Error al cancelar la cita',
        mensaje: error.message
      });
    }
  };
}

export default CitaController;