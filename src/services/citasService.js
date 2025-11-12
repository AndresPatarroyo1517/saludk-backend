import CitaRepository from '../repositories/citasRepository.js';
import notificationService from './notificationService.js';
import db from '../models/index.js';
import logger from '../utils/logger.js';

class CitaService {
  constructor() {
    this.repository = new CitaRepository();
    // Duración estándar de cita en minutos (configurable)
    this.DURACION_ESTANDAR = 30;
  }

  /**
   * Obtiene los slots disponibles de un médico para un rango de fechas
   */
  async obtenerDisponibilidad(medicoId, fechaInicio, fechaFin, modalidad = null, duracionCita = 30) {
    const medico = await this.repository.obtenerMedicoPorId(medicoId);
    if (!medico) {
      throw new Error('Médico no encontrado');
    }

    const disponibilidades = await this.repository.obtenerDisponibilidadPorMedico(medicoId, modalidad);
    
    if (disponibilidades.length === 0) {
      return {
        medico_id: medicoId,
        disponibilidad: [],
        mensaje: 'El médico no tiene horarios configurados'
      };
    }

    const citasAgendadas = await this.repository.obtenerCitasAgendadas(
      medicoId, 
      fechaInicio, 
      fechaFin
    );

    const slotsDisponibles = this._generarSlotsDisponibles(
      disponibilidades,
      citasAgendadas,
      fechaInicio,
      fechaFin,
      duracionCita
    );

    return {
      medico_id: medicoId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      duracion_cita_minutos: duracionCita,
      disponibilidad: slotsDisponibles
    };
  }

  /**
   * Genera los slots de tiempo disponibles
   * CORREGIDO: Ahora considera la duración completa de las citas al detectar conflictos
   */
  _generarSlotsDisponibles(disponibilidades, citasAgendadas, fechaInicio, fechaFin, duracionCita) {
    const slots = [];
    const citasConDuracion = this._crearMapaCitasConDuracion(citasAgendadas, duracionCita);

    const disponibilidadPorDia = {};
    disponibilidades.forEach(disp => {
      if (!disponibilidadPorDia[disp.dia_semana]) {
        disponibilidadPorDia[disp.dia_semana] = [];
      }
      disponibilidadPorDia[disp.dia_semana].push(disp);
    });

    let fechaActual = new Date(fechaInicio);
    fechaActual.setHours(0, 0, 0, 0);

    while (fechaActual <= fechaFin) {
      const diaSemana = fechaActual.getDay();
      const disponibilidadDia = disponibilidadPorDia[diaSemana];

      if (disponibilidadDia) {
        disponibilidadDia.forEach(disp => {
          const slotsDelBloque = this._generarSlotsPorBloque(
            fechaActual,
            disp,
            duracionCita,
            citasConDuracion
          );
          slots.push(...slotsDelBloque);
        });
      }

      fechaActual.setDate(fechaActual.getDate() + 1);
      fechaActual.setHours(0, 0, 0, 0);
    }

    return slots;
  }

  /**
   * Genera slots para un bloque de disponibilidad específico
   */
  _generarSlotsPorBloque(fecha, disponibilidad, duracionCita, citasConDuracion) {
    const slots = [];
    const [horaInicio, minutoInicio] = disponibilidad.hora_inicio.split(':').map(Number);
    const [horaFin, minutoFin] = disponibilidad.hora_fin.split(':').map(Number);

    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(horaInicio, minutoInicio, 0, 0);

    const fechaFin = new Date(fecha);
    fechaFin.setHours(horaFin, minutoFin, 0, 0);

    let horaActual = new Date(fechaInicio);

    while (horaActual < fechaFin) {
      const horaFinSlot = new Date(horaActual.getTime() + duracionCita * 60000);
      
      if (horaFinSlot <= fechaFin) {
        const disponible = !this._existeCitaEnSlot(horaActual, horaFinSlot, citasConDuracion);
        
        // Solo agregar slots futuros
        if (horaActual > new Date()) {
          slots.push({
            fecha_hora_inicio: new Date(horaActual),
            fecha_hora_fin: new Date(horaFinSlot),
            disponible: disponible,
            modalidad: disponibilidad.modalidad
          });
        }
      }

      horaActual = new Date(horaActual.getTime() + duracionCita * 60000);
    }

    return slots;
  }

  /**
   * Crea un mapa de citas con sus ventanas de tiempo completas
   * CORREGIDO: Ahora almacena inicio y fin de cada cita
   */
  _crearMapaCitasConDuracion(citas, duracionEstandar) {
    return citas.map(cita => {
      const inicio = new Date(cita.fecha_hora);
      const fin = new Date(inicio.getTime() + duracionEstandar * 60000);
      return { inicio, fin, cita };
    });
  }

  /**
   * Verifica si existe una cita en el slot de tiempo
   * CORREGIDO: Ahora verifica solapamiento de intervalos completos
   */
  _existeCitaEnSlot(horaInicio, horaFin, citasConDuracion) {
    return citasConDuracion.some(({ inicio, fin }) => {
      // Dos intervalos se solapan si:
      // (inicio1 < fin2) AND (fin1 > inicio2)
      return (horaInicio < fin) && (horaFin > inicio);
    });
  }

  /**
   * Valida si un slot específico está disponible para agendar
   * CORREGIDO: Ahora valida que el slot completo quepa en el horario disponible
   */
  async validarSlotDisponible(medicoId, fechaHora, duracionMinutos = 30) {
    const fecha = new Date(fechaHora);
    
    if (fecha <= new Date()) {
      return {
        disponible: false,
        motivo: 'La fecha debe ser futura'
      };
    }

    const diaSemana = fecha.getDay();
    const horaInicioSlot = fecha.getHours() * 60 + fecha.getMinutes();
    const horaFinSlot = horaInicioSlot + duracionMinutos;

    const disponibilidades = await this.repository.obtenerDisponibilidadPorMedico(medicoId);
    
    const disponibilidadValida = disponibilidades.find(disp => {
      if (disp.dia_semana !== diaSemana) return false;

      const [hI, mI] = disp.hora_inicio.split(':').map(Number);
      const [hF, mF] = disp.hora_fin.split(':').map(Number);
      const minutosInicio = hI * 60 + mI;
      const minutosFin = hF * 60 + mF;

      // CORREGIDO: Verificar que TODO el slot quepa en el horario
      return horaInicioSlot >= minutosInicio && horaFinSlot <= minutosFin;
    });

    if (!disponibilidadValida) {
      return {
        disponible: false,
        motivo: 'El médico no tiene disponibilidad configurada para este horario completo'
      };
    }

    const hayConflicto = await this.repository.verificarConflictoHorario(
      medicoId, 
      fecha, 
      duracionMinutos
    );

    if (hayConflicto) {
      return {
        disponible: false,
        motivo: 'Ya existe una cita agendada en este horario'
      };
    }

    return {
      disponible: true,
      modalidad: disponibilidadValida.modalidad
    };
  }

  /**
   * Crea una nueva cita validando disponibilidad
   * CORREGIDO: Eliminada duplicación, un solo método
   */
  async crearCita(datosCita) {
    const { 
      medico_id, 
      paciente_id, 
      fecha_hora, 
      modalidad, 
      motivo_consulta, 
      duracion_minutos = this.DURACION_ESTANDAR 
    } = datosCita;

    // Validaciones
    if (!medico_id || !paciente_id || !fecha_hora || !modalidad) {
      throw new Error('Los campos medico_id, paciente_id, fecha_hora y modalidad son requeridos');
    }

    if (!['PRESENCIAL', 'VIRTUAL'].includes(modalidad)) {
      throw new Error('La modalidad debe ser PRESENCIAL o VIRTUAL');
    }

    const medico = await this.repository.obtenerMedicoPorId(medico_id);
    if (!medico) {
      throw new Error('Médico no encontrado');
    }

    const fechaCita = new Date(fecha_hora);
    const validacion = await this.validarSlotDisponible(medico_id, fechaCita, duracion_minutos);
    
    if (!validacion.disponible) {
      throw new Error(`No se puede agendar la cita: ${validacion.motivo}`);
    }

    if (validacion.modalidad !== modalidad) {
      throw new Error(`El médico solo ofrece consultas ${validacion.modalidad} en ese horario`);
    }

    // Crear la cita
    const citaCreada = await this.repository.crearCita({
      paciente_id,
      medico_id,
      fecha_hora: fechaCita,
      modalidad,
      estado: 'AGENDADA',
      motivo_consulta: motivo_consulta || null,
      enlace_virtual: modalidad === 'VIRTUAL' ? this._generarEnlaceVirtual() : null
    });

    // Enviar notificación al paciente (mejor esfuerzo) y devolver indicador
    let notificacionEnviada = false;
    try {
      const paciente = await db.Paciente.findByPk(paciente_id, {
        include: [{ model: db.Usuario, as: 'usuario' }]
      });

      const medico = await db.Medico.findByPk(medico_id, {
        include: [{ model: db.Usuario, as: 'usuario' }]
      });

      if (paciente && paciente.usuario && paciente.usuario.email) {
        const fechaFormato = new Date(citaCreada.fecha_hora).toLocaleString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const nombreMedico = medico ? `${medico.usuario?.nombres} ${medico.usuario?.apellidos}` : 'Médico';
        const asunto = 'Confirmación de tu cita médica';
        const html = `
          <h2>¡Cita agendada exitosamente!</h2>
          <p>Hola ${paciente.usuario?.nombres},</p>
          <p>Tu cita ha sido agendada correctamente:</p>
          <ul>
            <li><strong>Médico:</strong> ${nombreMedico}</li>
            <li><strong>Fecha y Hora:</strong> ${fechaFormato}</li>
            <li><strong>Modalidad:</strong> ${citaCreada.modalidad}</li>
            ${citaCreada.motivo_consulta ? `<li><strong>Motivo:</strong> ${citaCreada.motivo_consulta}</li>` : ''}
            ${citaCreada.enlace_virtual ? `<li><strong>Enlace Virtual:</strong> <a href="${citaCreada.enlace_virtual}">${citaCreada.enlace_virtual}</a></li>` : ''}
          </ul>
          <p>Si necesitas cambiar o cancelar tu cita, contáctanos.</p>
        `;

        await notificationService.enviarEmailHTML({
          destinatarios: [paciente.usuario.email],
          asunto: asunto,
          html: html
        });

        logger.info(`Notificación de cita enviada a ${paciente.usuario.email}`);
        notificacionEnviada = true;
      }
    } catch (err) {
      logger.warn(`Error enviando notificación de cita creada: ${err.message}`);
      // No lanzar excepción, solo registrar. notificacionEnviada queda false
    }

    return {
      id: citaCreada.id,
      paciente_id: citaCreada.paciente_id,
      medico_id: citaCreada.medico_id,
      fecha_hora: citaCreada.fecha_hora,
      modalidad: citaCreada.modalidad,
      estado: citaCreada.estado,
      motivo_consulta: citaCreada.motivo_consulta,
      enlace_virtual: citaCreada.enlace_virtual,
      duracion_estimada_minutos: duracion_minutos,
      notificacion_enviada: notificacionEnviada
    };
  }

  /**
   * Obtiene todas las citas de un paciente con filtros opcionales
   */
  async obtenerCitasPaciente(pacienteId, filtros = {}) {
    const { estado, fecha_desde, fecha_hasta, modalidad, ordenar_por = 'fecha_hora' } = filtros;

    const citas = await this.repository.obtenerCitasPaciente(
      pacienteId,
      estado,
      fecha_desde,
      fecha_hasta,
      modalidad,
      ordenar_por
    );

    if (citas.length === 0) {
      return [];
    }

    // Enriquecer datos de citas con información del médico
    return citas.map(cita => ({
      id: cita.id,
      paciente_id: cita.paciente_id,
      medico_id: cita.medico_id,
      medico: {
        id: cita.medico?.id,
        nombres: cita.medico?.nombres,
        apellidos: cita.medico?.apellidos,
        especialidad: cita.medico?.especialidad,
        calificacion_promedio: cita.medico?.calificacion_promedio
      },
      fecha_hora: cita.fecha_hora,
      modalidad: cita.modalidad,
      estado: cita.estado,
      motivo_consulta: cita.motivo_consulta,
      enlace_virtual: cita.enlace_virtual,
      notas_consulta: cita.notas_consulta,
      costo_pagado: cita.costo_pagado,
      fecha_creacion: cita.fecha_creacion,
      fecha_actualizacion: cita.fecha_actualizacion
    }));
  }

  /**
   * Cancela una cita (solo si está en estado AGENDADA o CONFIRMADA)
   */
  async cancelarCita(citaId, motivo_cancelacion = null) {
    const cita = await this.repository.obtenerCitaPorId(citaId);

    if (!cita) {
      throw new Error('Cita no encontrada');
    }

    // Validar que la cita pueda ser cancelada
    if (!['AGENDADA', 'CONFIRMADA'].includes(cita.estado)) {
      throw new Error(
        `No se puede cancelar una cita en estado ${cita.estado}. ` +
        `Solo se pueden cancelar citas en estado AGENDADA o CONFIRMADA`
      );
    }

    // Validar que la cita no sea en el pasado (con 24 horas de anticipación)
    const ahora = new Date();
    const veinticuatroHoras = 24 * 60 * 60 * 1000;
    const fechaCita = new Date(cita.fecha_hora);

    if (fechaCita.getTime() - ahora.getTime() < veinticuatroHoras) {
      throw new Error(
        'No se puede cancelar una cita con menos de 24 horas de anticipación. ' +
        'Por favor, comuníquese con la clínica.'
      );
    }

    // Actualizar cita a CANCELADA
    const citaCancelada = await this.repository.actualizarCita(citaId, {
      estado: 'CANCELADA',
      notas_consulta: motivo_cancelacion ? `Cancelada: ${motivo_cancelacion}` : 'Cancelada por paciente'
    });

    return {
      id: citaCancelada.id,
      estado: citaCancelada.estado,
      fecha_hora: citaCancelada.fecha_hora,
      medico_id: citaCancelada.medico_id,
      paciente_id: citaCancelada.paciente_id,
      mensaje: 'Cita cancelada exitosamente'
    };
  }

  /**
   * Genera un enlace virtual para la cita
   */
  _generarEnlaceVirtual() {
    const codigoReunion = Math.random().toString(36).substring(2, 15);
    return `https://meet.tuapp.com/${codigoReunion}`;
  }
}

export default CitaService;