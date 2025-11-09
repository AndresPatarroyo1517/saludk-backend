// services/medicoService.js
import MedicoRepository from '../repositories/medicoRepository.js';

class MedicoService {
  constructor() {
    this.repository = new MedicoRepository();
  }

  /**
   * Configura la disponibilidad horaria de un médico
   * @param {string} medicoId - UUID del médico
   * @param {Array} disponibilidades - Array de disponibilidades
   * @returns {Promise<Object>} Resultado de la operación
   */
  async configurarDisponibilidad(medicoId, disponibilidades) {
    // Validar que el médico existe
    const medico = await this.repository.obtenerMedicoPorId(medicoId);
    if (!medico) {
      throw new Error('Médico no encontrado');
    }

    // Validar estructura de disponibilidades
    this._validarDisponibilidades(disponibilidades);

    // Guardar disponibilidades
    const disponibilidadesCreadas = await this.repository.configurarDisponibilidad(
      medicoId,
      disponibilidades
    );

    return {
      medico_id: medicoId,
      total_bloques: disponibilidadesCreadas.length,
      disponibilidades: disponibilidadesCreadas
    };
  }

  /**
   * Valida la estructura de las disponibilidades
   * @private
   */
  _validarDisponibilidades(disponibilidades) {
    if (!Array.isArray(disponibilidades) || disponibilidades.length === 0) {
      throw new Error('Debe proporcionar al menos una disponibilidad');
    }

    disponibilidades.forEach((disp, index) => {
      // Validar campos requeridos
      if (disp.dia_semana === undefined || disp.dia_semana === null) {
        throw new Error(`Disponibilidad ${index + 1}: dia_semana es requerido`);
      }

      if (!disp.hora_inicio) {
        throw new Error(`Disponibilidad ${index + 1}: hora_inicio es requerido`);
      }

      if (!disp.hora_fin) {
        throw new Error(`Disponibilidad ${index + 1}: hora_fin es requerido`);
      }

      if (!disp.modalidad) {
        throw new Error(`Disponibilidad ${index + 1}: modalidad es requerido`);
      }

      // Validar día de semana (0-6)
      if (disp.dia_semana < 0 || disp.dia_semana > 6) {
        throw new Error(`Disponibilidad ${index + 1}: dia_semana debe estar entre 0 y 6`);
      }

      // Validar modalidad
      if (!['PRESENCIAL', 'VIRTUAL'].includes(disp.modalidad)) {
        throw new Error(`Disponibilidad ${index + 1}: modalidad debe ser PRESENCIAL o VIRTUAL`);
      }

      // Validar formato de hora (HH:mm:ss)
      const horaRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
      if (!horaRegex.test(disp.hora_inicio)) {
        throw new Error(`Disponibilidad ${index + 1}: hora_inicio debe tener formato HH:mm:ss`);
      }

      if (!horaRegex.test(disp.hora_fin)) {
        throw new Error(`Disponibilidad ${index + 1}: hora_fin debe tener formato HH:mm:ss`);
      }

      // Validar que hora_fin sea mayor que hora_inicio
      if (disp.hora_inicio >= disp.hora_fin) {
        throw new Error(`Disponibilidad ${index + 1}: hora_fin debe ser mayor que hora_inicio`);
      }
    });
  }

  /**
   * Obtiene la disponibilidad configurada de un médico
   * @param {string} medicoId - UUID del médico
   * @returns {Promise<Object>} Disponibilidad del médico
   */
  async obtenerDisponibilidad(medicoId) {
    const medico = await this.repository.obtenerMedicoPorId(medicoId);
    if (!medico) {
      throw new Error('Médico no encontrado');
    }

    const disponibilidades = await this.repository.obtenerDisponibilidadMedico(medicoId);

    // Agrupar por día de semana
    const disponibilidadPorDia = this._agruparPorDia(disponibilidades);

    return {
      medico_id: medicoId,
      nombre_completo: `${medico.nombres} ${medico.apellidos}`,
      disponibilidad_por_dia: disponibilidadPorDia,
      total_bloques: disponibilidades.length
    };
  }

  /**
   * Agrupa disponibilidades por día de semana
   * @private
   */
  _agruparPorDia(disponibilidades) {
    const diasSemana = {
      0: 'Domingo',
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado'
    };

    const agrupado = {};

    disponibilidades.forEach(disp => {
      const dia = disp.dia_semana;
      if (!agrupado[dia]) {
        agrupado[dia] = {
          dia_numero: dia,
          dia_nombre: diasSemana[dia],
          bloques: []
        };
      }

      agrupado[dia].bloques.push({
        id: disp.id,
        hora_inicio: disp.hora_inicio,
        hora_fin: disp.hora_fin,
        modalidad: disp.modalidad,
        disponible: disp.disponible
      });
    });

    // Ordenar por día
    return Object.values(agrupado).sort((a, b) => a.dia_numero - b.dia_numero);
  }

  /**
   * Lista médicos disponibles con filtros y paginación
   * @param {Object} filtros - Filtros de búsqueda
   * @returns {Promise<Object>} Médicos y metadatos de paginación
   */
  async listarMedicosDisponibles(filtros = {}) {
    const medicos = await this.repository.listarMedicosDisponibles(filtros);
    const total = await this.repository.contarMedicosDisponibles(filtros);

    const limit = parseInt(filtros.limit) || 50;
    const offset = parseInt(filtros.offset) || 0;
    const totalPaginas = Math.ceil(total / limit);
    const paginaActual = Math.floor(offset / limit) + 1;

    return {
      medicos: medicos.map(medico => this._formatearMedico(medico)),
      paginacion: {
        total,
        limite: limit,
        offset,
        pagina_actual: paginaActual,
        total_paginas: totalPaginas,
        tiene_siguiente: paginaActual < totalPaginas,
        tiene_anterior: paginaActual > 1
      },
      filtros_aplicados: this._obtenerFiltrosAplicados(filtros)
    };
  }

  /**
   * Formatea los datos de un médico para la respuesta
   * @private
   */
  _formatearMedico(medico) {
    const medicoJson = medico.toJSON ? medico.toJSON() : medico;
    
    return {
      id: medicoJson.id,
      nombres: medicoJson.nombres,
      apellidos: medicoJson.apellidos,
      nombre_completo: `${medicoJson.nombres} ${medicoJson.apellidos}`,
      especialidad: medicoJson.especialidad,
      registro_medico: medicoJson.registro_medico,
      calificacion_promedio: parseFloat(medicoJson.calificacion_promedio) || 0,
      costo_consulta_presencial: parseFloat(medicoJson.costo_consulta_presencial),
      costo_consulta_virtual: parseFloat(medicoJson.costo_consulta_virtual),
      localidad: medicoJson.localidad,
      telefono: medicoJson.telefono,
      tiene_disponibilidad: medicoJson.disponibilidades && medicoJson.disponibilidades.length > 0,
      modalidades_disponibles: this._obtenerModalidadesDisponibles(medicoJson.disponibilidades)
    };
  }

  /**
   * Obtiene las modalidades disponibles de un médico
   * @private
   */
  _obtenerModalidadesDisponibles(disponibilidades) {
    if (!disponibilidades || disponibilidades.length === 0) {
      return [];
    }

    const modalidades = new Set(disponibilidades.map(d => d.modalidad));
    return Array.from(modalidades);
  }

  /**
   * Obtiene los filtros que fueron aplicados
   * @private
   */
  _obtenerFiltrosAplicados(filtros) {
    const aplicados = {};
    
    const filtrosValidos = [
      'especialidad',
      'localidad',
      'modalidad',
      'dia_semana',
      'calificacion_minima',
      'costo_maximo',
      'nombre'
    ];

    filtrosValidos.forEach(key => {
      if (filtros[key] !== undefined && filtros[key] !== null && filtros[key] !== '') {
        aplicados[key] = filtros[key];
      }
    });

    return aplicados;
  }

  /**
   * Obtiene el detalle completo de un médico
   * @param {string} medicoId - UUID del médico
   * @param {boolean} incluirCalificaciones - Si incluir calificaciones recientes
   * @returns {Promise<Object>} Detalle del médico
   */
  async obtenerDetalleMedico(medicoId, incluirCalificaciones = true) {
    const medico = await this.repository.obtenerMedicoPorId(medicoId);
    
    if (!medico) {
      throw new Error('Médico no encontrado');
    }

    const medicoJson = medico.toJSON();

    const detalle = {
      id: medicoJson.id,
      numero_identificacion: medicoJson.numero_identificacion,
      nombres: medicoJson.nombres,
      apellidos: medicoJson.apellidos,
      nombre_completo: `${medicoJson.nombres} ${medicoJson.apellidos}`,
      especialidad: medicoJson.especialidad,
      registro_medico: medicoJson.registro_medico,
      calificacion_promedio: parseFloat(medicoJson.calificacion_promedio) || 0,
      costo_consulta_presencial: parseFloat(medicoJson.costo_consulta_presencial),
      costo_consulta_virtual: parseFloat(medicoJson.costo_consulta_virtual),
      localidad: medicoJson.localidad,
      telefono: medicoJson.telefono,
      disponible: medicoJson.disponible,
      email: medicoJson.usuario?.email,
      fecha_registro: medicoJson.fecha_registro,
      disponibilidad: this._agruparPorDia(medicoJson.disponibilidades || [])
    };

    if (incluirCalificaciones) {
      const calificaciones = await this.repository.obtenerCalificaciones(medicoId, 5);
      detalle.calificaciones_recientes = calificaciones;
      detalle.total_calificaciones = calificaciones.length;
    }

    return detalle;
  }
}

export default MedicoService;