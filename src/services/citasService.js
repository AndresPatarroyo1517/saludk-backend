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
   * Normaliza una fecha de entrada (string o Date) a un Date en UTC.
   * - Si la entrada tiene un indicador de zona (Z o ±hh:mm) se respeta y
   *   se construye la Date correspondiente.
   * - Si la entrada NO tiene zona, se interpreta como hora local del cliente
   *   y se convierte a UTC manteniendo la hora "wall-clock" indicada.
   */
  _parseInputDateToUTC(input) {
    if (!input) return null;
    let d;
    if (input instanceof Date) {
      d = input;
    } else {
      // string
      const s = String(input);
      // detecta si contiene Z o un offset +HH or -HH
      const hasZone = /Z$|[+-]\d{2}:?\d{2}$/i.test(s);
      if (hasZone) {
        d = new Date(s);
      } else {
        // Interpretar como hora local y crear objeto UTC con la misma hora "wall-clock"
        const local = new Date(s);
        d = new Date(Date.UTC(
          local.getFullYear(),
          local.getMonth(),
          local.getDate(),
          local.getHours(),
          local.getMinutes(),
          local.getSeconds(),
          local.getMilliseconds()
        ));
      }
    }
    return d;
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
      fechaFin,
      ['AGENDADA', 'CONFIRMADA'],
      duracionCita
    );

    // LOG: para depuración — cuántas citas se encontraron y sus horas
    try {
      logger.info(`Disponibilidad: medico=${medicoId} fechas=[${fechaInicio.toISOString()} - ${fechaFin.toISOString()}] citasAgendadas=${citasAgendadas.length}`);
      citasAgendadas.forEach(c => {
        logger.debug(`Cita agendada: id=${c.id} fecha_hora=${new Date(c.fecha_hora).toISOString()} estado=${c.estado}`);
      });
    } catch (err) {
      // No detener ejecución por logs
      logger.debug('Error al loguear citasAgendadas: ' + err.message);
    }

    const slotsDisponibles = this._generarSlotsDisponibles(
      disponibilidades,
      citasAgendadas,
      fechaInicio,
      fechaFin,
      duracionCita
    );
    // Filtrar y devolver SOLO los slots realmente disponibles (no incluir los ocupados)
    const soloDisponibles = slotsDisponibles.filter(s => s.disponible === true);

    return {
      medico_id: medicoId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      duracion_cita_minutos: duracionCita,
      disponibilidad: soloDisponibles
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
    return citasConDuracion.some(({ inicio, fin, cita }) => {
      // Dos intervalos se solapan si:
      // (inicio1 < fin2) AND (fin1 > inicio2)
      const solapa = (horaInicio < fin) && (horaFin > inicio);
      if (solapa) {
        try {
          logger.debug(`Slot ocupado detectado: slot=[${horaInicio.toISOString()} - ${horaFin.toISOString()}] por cita=${cita?.id} cita_window=[${inicio.toISOString()} - ${fin.toISOString()}]`);
        } catch (err) {
          logger.debug('Error logueando solapamiento: ' + err.message);
        }
      }
      return solapa;
    });
  }

  /**
   * Valida si un slot específico está disponible para agendar
   * CORREGIDO: Ahora valida que el slot completo quepa en el horario disponible
   */
  async validarSlotDisponible(medicoId, fechaHora, duracionMinutos = 30, excludeCitaId = null) {
    const fecha = this._parseInputDateToUTC(fechaHora instanceof Date ? fechaHora : fechaHora);
    
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
      duracionMinutos,
      excludeCitaId
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
      fecha_hora,
      modalidad,
      motivo_consulta,
      duracion_minutos = this.DURACION_ESTANDAR
    } = datosCita;
    let paciente_id = datosCita.paciente_id;

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

    // Validar y mapear paciente_id: permitir que el cliente envíe el `paciente.id`
    // o, por conveniencia, el `usuario.id` asociado al paciente (caso frontend)
    let pacienteRecord = await db.Paciente.findByPk(paciente_id);
    if (!pacienteRecord) {
      // Intentar mapear si el frontend envía el usuario.id en lugar del paciente.id
      pacienteRecord = await db.Paciente.findOne({ where: { usuario_id: paciente_id } });
      if (pacienteRecord) {
        // Reemplazar paciente_id por el id real del paciente
        paciente_id = pacienteRecord.id;
      }
    }

    if (!pacienteRecord) {
      throw new Error('Paciente no encontrado');
    }

    const fechaCita = this._parseInputDateToUTC(fecha_hora);
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

    // Invalidar cache relacionado (si existe) para que la disponibilidad se refresque
    try {
      const cacheModule = await import('../config/cache.js').catch(() => null);
      const cache = cacheModule && (cacheModule.default || cacheModule);
      if (cache && typeof cache.invalidateNamespace === 'function') {
        // Invalidate by medico and paciente namespaces (best-effort)
        await cache.invalidateNamespace(`disponibilidad:medico:${medico_id}`);
        await cache.invalidateNamespace(`citas:paciente:${paciente_id}`);
      }
    } catch (err) {
      logger.debug('No se pudo invalidar cache tras crear cita: ' + err.message);
    }
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

    // Si ya está cancelada, devolver resultado idempotente en vez de error
    if (cita.estado === 'CANCELADA') {
      return {
        id: cita.id,
        estado: cita.estado,
        fecha_hora: cita.fecha_hora,
        medico_id: cita.medico_id,
        paciente_id: cita.paciente_id,
        mensaje: 'La cita ya se encuentra en estado CANCELADA'
      };
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

    // Invalidar cache para que la disponibilidad vuelva a mostrarse
    try {
      const cacheModule = await import('../config/cache.js').catch(() => null);
      const cache = cacheModule && (cacheModule.default || cacheModule);
      if (cache && typeof cache.invalidateNamespace === 'function') {
        await cache.invalidateNamespace(`disponibilidad:medico:${citaCancelada.medico_id}`);
        await cache.invalidateNamespace(`citas:paciente:${citaCancelada.paciente_id}`);
      }
    } catch (err) {
      logger.debug('No se pudo invalidar cache tras cancelar cita: ' + err.message);
    }
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
   * Edita una cita existente - acepta CUALQUIER campo editable
   * Campos protegidos (no editables): id, paciente_id, medico_id, estado, fecha_creacion, fecha_actualizacion
   * Valida disponibilidad solo si se cambia fecha_hora
   */
  async editarCita(citaId, datosActualizacion) {
    const cita = await this.repository.obtenerCitaPorId(citaId);

    if (!cita) {
      throw new Error('Cita no encontrada');
    }

    // Validar que la cita pueda ser editada (solo en estados AGENDADA o CONFIRMADA)
    if (!['AGENDADA', 'CONFIRMADA'].includes(cita.estado)) {
      throw new Error(
        `No se puede editar una cita en estado ${cita.estado}. ` +
        `Solo se pueden editar citas en estado AGENDADA o CONFIRMADA`
      );
    }

    // Campos no editables (protegidos)
    const camposProtegidos = ['id', 'paciente_id', 'medico_id', 'estado', 'fecha_creacion', 'fecha_actualizacion'];
    
    // Preparar datos a actualizar (excluir campos protegidos)
    const actualizacion = {};
    
    for (const [key, value] of Object.entries(datosActualizacion)) {
      if (!camposProtegidos.includes(key) && value !== undefined) {
        actualizacion[key] = value;
      }
    }

    // Si se cambia fecha/hora, validar disponibilidad y anticipación
    if (actualizacion.fecha_hora) {
      const nuevaFecha = this._parseInputDateToUTC(actualizacion.fecha_hora);

      // Validar que sea una fecha válida
      if (isNaN(nuevaFecha.getTime())) {
        throw new Error('La fecha_hora debe ser una fecha válida en formato ISO 8601');
      }

      // Validar que no sea en el pasado (24 horas de anticipación)
      const ahora = new Date();
      const veinticuatroHoras = 24 * 60 * 60 * 1000;

      if (nuevaFecha.getTime() - ahora.getTime() < veinticuatroHoras) {
        throw new Error(
          'No se puede agendar o cambiar una cita con menos de 24 horas de anticipación'
        );
      }

      // Validar que el slot esté disponible (excluyendo la cita actual)
      const duracionCita = 30; // Duración estándar
      const validacion = await this.validarSlotDisponible(
        cita.medico_id,
        nuevaFecha,
        duracionCita,
        citaId // Excluir la cita actual de la validación
      );

      if (!validacion.disponible) {
        throw new Error(`El horario seleccionado no está disponible para el médico: ${validacion.motivo || ''}`);
      }
    }

    // Si se cambia a modalidad VIRTUAL y no tiene enlace, generar uno
    if (actualizacion.modalidad === 'VIRTUAL' && !cita.enlace_virtual) {
      actualizacion.enlace_virtual = this._generarEnlaceVirtual();
    }

    // Validar que hay al menos un campo a actualizar
    if (Object.keys(actualizacion).length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }

    // Actualizar la cita
    const citaActualizada = await this.repository.actualizarCita(citaId, actualizacion);

    logger.info(`✅ Cita ${citaId} actualizada exitosamente`);

    // Invalidar cache tras edición para refrescar disponibilidad
    try {
      const cacheModule = await import('../config/cache.js').catch(() => null);
      const cache = cacheModule && (cacheModule.default || cacheModule);
      if (cache && typeof cache.invalidateNamespace === 'function') {
        await cache.invalidateNamespace(`disponibilidad:medico:${cita.medico_id}`);
        await cache.invalidateNamespace(`citas:paciente:${cita.paciente_id}`);
      }
    } catch (err) {
      logger.debug('No se pudo invalidar cache tras editar cita: ' + err.message);
    }

    // Enviar notificación al paciente
    try {
      await notificationService.notificarCambiosCita(cita.paciente_id, citaActualizada);
    } catch (error) {
      logger.error('Error enviando notificación de cambio de cita: ' + error.message);
      // No lanzar error, solo loguear
    }

    return citaActualizada;
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