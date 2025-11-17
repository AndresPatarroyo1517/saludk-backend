import CitaService from '../services/citasService.js';
import logger from '../utils/logger.js';
import db from '../models/index.js';

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
      console.error('Error al obtener disponibilidad: - citasController.js:86', error);
      
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
      console.error('Error al validar slot: - citasController.js:138', error);
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
      console.error('Error al obtener próximos slots: - citasController.js:191', error);
      
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

      const notificacionEnviada = !!cita.notificacion_enviada;
      res.status(201).json({
        success: true,
        mensaje: notificacionEnviada
          ? 'Cita creada exitosamente. Se ha enviado una confirmación por correo.'
          : 'Cita creada exitosamente. No se pudo enviar la confirmación por correo.',
        data: cita,
        notificacion: {
          enviada: notificacionEnviada,
          tipo: 'email'
        }
      });

    } catch (error) {
      console.error('Error al crear cita: - citasController.js:261', error);

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
   * NOTA: Acepta paciente_id o usuario_id y mapea automáticamente
   */
  obtenerCitasPaciente = async (req, res) => {
    try {
      let { pacienteId } = req.params;
      const { estado, fecha_desde, fecha_hasta, modalidad, ordenar_por } = req.query;

      // LOG: registrar parámetros entrantes para depuración de endpoint
      try {
        logger.info(`obtenerCitasPaciente - pacienteId=${pacienteId} query=${JSON.stringify(req.query)}`);
      } catch (err) {
        logger.debug('obtenerCitasPaciente - no se pudo serializar query params');
      }

      if (!pacienteId) {
        return res.status(400).json({
          error: 'El parámetro pacienteId es requerido'
        });
      }

      // Mapear usuario_id a paciente_id si es necesario
      let paciente = await db.Paciente.findByPk(pacienteId);
      if (!paciente) {
        // Intentar buscar por usuario_id
        paciente = await db.Paciente.findOne({ where: { usuario_id: pacienteId } });
        if (paciente) {
          pacienteId = paciente.id;
        }
      }

      if (!paciente) {
        return res.status(404).json({
          error: 'Paciente no encontrado'
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

      try {
        logger.info(`obtenerCitasPaciente - pacienteId=${pacienteId} total_citas_recuperadas=${citas.length}`);
      } catch (err) {
        logger.debug('obtenerCitasPaciente - no se pudo loggear cantidad de citas');
      }

      res.status(200).json({
        success: true,
        data: {
          paciente_id: pacienteId,
          total_citas: citas.length,
          citas
        }
      });

    } catch (error) {
      logger.error('Error al obtener citas del paciente: citasController.js - ' + error.message);
      res.status(500).json({
        error: 'Error al obtener las citas del paciente',
        mensaje: error.message
      });
    }
  };

  /**
   * GET /citas/medico/:medicoId
   * Obtiene todas las citas de un medico con filtros de fecha
   * NOTA: Me copie del metodo de arriba
   */
  obtenerCitasMedico = async (req, res) => {
    try {
      let { medicoId } = req.params;
      const { rango, ordenar_por } = req.query;

      try {
        logger.info(`obtenerCitasMedico - medicoId=${medicoId} query=${JSON.stringify(req.query)}`);
      } catch (err) {
        logger.debug('obtenerCitasMedico - no se pudo serializar query params');
      }

      if (!medicoId) {
        return res.status(400).json({
          error: 'El parámetro medicoId es requerido'
        });
      }

      // Buscar médico
      let medico = await db.Medico.findByPk(medicoId);
      if (!medico) {
        medico = await db.Medico.findOne({ where: { usuario_id: medicoId } });
        if (medico) medicoId = medico.id;
      }

      if (!medico) {
        return res.status(404).json({
          error: 'Médico no encontrado'
        });
      }

      const filtros = {
        rango: rango || null,     // hoy | semana | mes
        ordenar_por: ordenar_por || 'fecha_hora'
      };

      const citas = await this.service.obtenerCitasMedico(medicoId, filtros);

      try {
        logger.info(`obtenerCitasMedico - medicoId=${medicoId} total_citas_recuperadas=${citas.length}`);
      } catch (err) {
        logger.debug('obtenerCitasMedico - no se pudo loggear cantidad de citas');
      }

      res.status(200).json({
        success: true,
        data: {
          medico_id: medicoId,
          total_citas: citas.length,
          citas
        }
      });

    } catch (error) {
      logger.error('Error al obtener citas del médico: citasController.js - ' + error.message);
      res.status(500).json({
        error: 'Error al obtener las citas del médico',
        mensaje: error.message
      });
    }
  };

  /**
   * PUT /citas/:citaId
   * Edita una cita existente - acepta CUALQUIER campo editable
   * Body: { fecha_hora?, modalidad?, motivo_consulta?, notas_consulta?, enlace_virtual?, ... }
   * IMPORTANTE: JSON debe estar correctamente formado con COMILLAS DOBLES
   */
  editarCita = async (req, res) => {
    try {
      const { citaId } = req.params;
      const datosActualizacion = req.body;

      if (!citaId) {
        return res.status(400).json({
          error: 'El parámetro citaId es requerido'
        });
      }

      if (!datosActualizacion || Object.keys(datosActualizacion).length === 0) {
        return res.status(400).json({
          error: 'Debe proporcionar al menos un campo para actualizar',
          ejemplo: {
            "fecha_hora": "2025-11-20T14:30:00Z",
            "modalidad": "VIRTUAL",
            "motivo_consulta": "Consulta de seguimiento"
          },
          nota: "Asegúrese de usar COMILLAS DOBLES en todas las propiedades y valores de JSON"
        });
      }

      // Eliminar campos que no deben ser actualizados desde el endpoint
      if (datosActualizacion.hasOwnProperty('notas_consulta')) {
        delete datosActualizacion.notas_consulta;
      }

      // Si se solicita cambio de estado, validar permisos y reglas
      if (datosActualizacion.hasOwnProperty('estado')) {
        const nuevoEstado = String(datosActualizacion.estado).toUpperCase();

        // Requiere autenticación
        const user = req.user;
        if (!user) {
          return res.status(401).json({ error: 'No autenticado' });
        }

        // Cargar cita completa (paciente y medico con usuario)
        const cita = await db.Cita.findByPk(citaId, {
          include: [
            { association: 'paciente', include: [{ association: 'usuario' }] },
            { association: 'medico', include: [{ association: 'usuario' }] }
          ]
        });

        if (!cita) {
          return res.status(404).json({ error: 'Cita no encontrada' });
        }

        const usuarioId = user.userId;
        const esAdmin = user.rol === 'ADMIN';
        const esPacientePropietario = cita.paciente && cita.paciente.usuario && cita.paciente.usuario.id === usuarioId;
        const esMedicoAsociado = cita.medico && cita.medico.usuario && cita.medico.usuario.id === usuarioId;

        // Reglas para cada transición
        if (nuevoEstado === 'CONFIRMADA') {
          if (!esAdmin && !esMedicoAsociado) {
            return res.status(403).json({ error: 'No tiene permisos para confirmar esta cita' });
          }
          if (cita.estado !== 'AGENDADA') {
            return res.status(400).json({ error: `No se puede confirmar una cita en estado ${cita.estado}` });
          }
        }

        if (nuevoEstado === 'COMPLETADA') {
          if (!esAdmin && !esMedicoAsociado) {
            return res.status(403).json({ error: 'No tiene permisos para marcar como completada esta cita' });
          }
          const ahora = new Date();
          const fechaCita = new Date(cita.fecha_hora);
          if (fechaCita > ahora) {
            return res.status(400).json({ error: 'No se puede marcar como completada una cita que aún no ha ocurrido' });
          }
        }

        if (nuevoEstado === 'CANCELADA') {
          if (!esAdmin && !esPacientePropietario && !esMedicoAsociado) {
            return res.status(403).json({ error: 'No tiene permisos para cancelar esta cita' });
          }
          // Reutilizar la lógica de servicio de cancelación (valida anticipación y estados)
          try {
            const citaCancelada = await this.service.cancelarCita(citaId, null);
            return res.status(200).json({ success: true, mensaje: 'Cita cancelada exitosamente', data: citaCancelada });
          } catch (err) {
            if (err.message && err.message.includes('No se puede cancelar')) {
              return res.status(400).json({ error: err.message });
            }
            throw err;
          }
        }

        // Asignar estado validado
        datosActualizacion.estado = nuevoEstado;
      }

      const citaActualizada = await this.service.editarCita(citaId, datosActualizacion);

      res.status(200).json({
        success: true,
        mensaje: 'Cita actualizada exitosamente',
        data: citaActualizada
      });

    } catch (error) {
      logger.error('Error al editar cita: citasController.js - ' + error.message);

      if (error.message === 'Cita no encontrada') {
        return res.status(404).json({
          error: error.message
        });
      }

      if (error.message.includes('No se puede editar') || 
          error.message.includes('No se puede agendar') ||
          error.message.includes('No hay campos válidos') ||
          error.message.includes('debe ser una fecha válida')) {
        return res.status(400).json({
          error: error.message
        });
      }

      if (error.message.includes('no está disponible')) {
        return res.status(409).json({
          error: error.message
        });
      }

      res.status(500).json({
        error: 'Error al actualizar la cita',
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
      // Evitar crash si req.body es undefined (peticiones DELETE sin body desde front)
      const { motivo_cancelacion } = req.body || {};

      if (!citaId) {
        return res.status(400).json({
          error: 'El parámetro citaId es requerido'
        });
      }

      // AUTHORIZATION: permitir solo al paciente dueño, al médico asociado o a admins
      const user = req.user;
      try {
        logger.debug('cancelarCita - req.user: ' + JSON.stringify(user));
      } catch (err) {
        logger.debug('cancelarCita - req.user (no serializable)');
      }
      if (!user) {
        logger.info(`cancelarCita - sin usuario en req para citaId=${citaId}`);
        return res.status(401).json({ error: 'No autenticado' });
      }

      // Cargar cita con relaciones necesarias
      const cita = await db.Cita.findByPk(citaId, {
        include: [
          { association: 'paciente', include: [{ association: 'usuario' }] },
          { association: 'medico', include: [{ association: 'usuario' }] }
        ]
      });

      try {
        logger.debug('cancelarCita - cita encontrada: ' + JSON.stringify({ id: cita?.id, fecha_hora: cita?.fecha_hora, estado: cita?.estado, paciente: cita?.paciente?.id, medico: cita?.medico?.id }));
      } catch (err) {
        logger.debug('cancelarCita - cita (no serializable)');
      }

      if (!cita) {
        logger.info(`cancelarCita - cita no encontrada: ${citaId}`);
        return res.status(404).json({ error: 'Cita no encontrada' });
      }

      const usuarioId = user.userId;
      const esAdmin = user.rol === 'ADMIN';
      const esPacientePropietario = cita.paciente && cita.paciente.usuario && cita.paciente.usuario.id === usuarioId;
      const esMedicoAsociado = cita.medico && cita.medico.usuario && cita.medico.usuario.id === usuarioId;

      if (!esAdmin && !esPacientePropietario && !esMedicoAsociado) {
        logger.info(`cancelarCita - usuario sin permisos: userId=${usuarioId} citaId=${citaId} pacienteUsuario=${cita.paciente?.usuario?.id} medicoUsuario=${cita.medico?.usuario?.id}`);
        return res.status(403).json({ error: 'No tiene permisos para cancelar esta cita' });
      }

      logger.info(`cancelarCita - permiso validado: userId=${usuarioId} procediendo a cancelar cita=${citaId}`);
      const citaCancelada = await this.service.cancelarCita(citaId, motivo_cancelacion);

      res.status(200).json({
        success: true,
        mensaje: 'Cita cancelada exitosamente',
        data: citaCancelada
      });

    } catch (error) {
      console.error('Error al cancelar cita: - citasController.js:475', error);

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

  /**
   * GET /medico/:medicoId/estadisticas
   * 
   */
  obtenerEstadisticasCitasMedico = async (req, res) => {
    try {
      let { medicoId } = req.params;

      if (!medicoId) {
        return res.status(400).json({ error: 'El parámetro medicoId es requerido' });
      }

      let medico = await db.Medico.findByPk(medicoId);

      if (!medico) {
        medico = await db.Medico.findOne({ where: { usuario_id: medicoId } });
        if (medico) medicoId = medico.id;
      }

      if (!medico) {
        return res.status(404).json({ error: 'Médico no encontrado' });
      }

      const data = await this.service.obtenerEstadisticasCitasMedico(medicoId);

      res.status(200).json({ success: true, data });

    } catch (error) {
      logger.error('Error al obtener estadísticas de citas del médico: ' + error.message);
      res.status(500).json({
        error: 'Error al obtener estadísticas de citas del médico',
        mensaje: error.message
      });
    }
  };

}

export default CitaController;