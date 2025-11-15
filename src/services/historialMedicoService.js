import historialMedicoRepository from '../repositories/historialMedicoRepository.js';
import logger from '../utils/logger.js';

class HistorialMedicoService {
  /**
   * Valida la estructura de enfermedades crónicas
   * @param {Array} enfermedades 
   * @throws {AppError}
   */
  validarEnfermedadesCronicas(enfermedades) {
    if (!Array.isArray(enfermedades)) {
        logger.error('HistorialMedicoService.validarEnfermedadesCronicas error: ' + 'Las enfermedades crónicas deben ser un array'); 
        return;
    }

    for (const enfermedad of enfermedades) {
      if (!enfermedad.nombre || typeof enfermedad.nombre !== 'string') {
        logger.error('HistorialMedicoService.validarEnfermedadesCronicas error: ' + 'Cada enfermedad debe tener un nombre válido'); 
        return;
      }
      if (enfermedad.desde && !/^\d{4}-\d{2}-\d{2}$/.test(enfermedad.desde)) {
        logger.error('HistorialMedicoService.validarEnfermedadesCronicas error: ' + 'La fecha "desde" debe estar en formato YYYY-MM-DD'); 
        return;
      }
      if (enfermedad.estado && !['activa', 'controlada', 'en_remision'].includes(enfermedad.estado)) {
        logger.error('HistorialMedicoService.validarEnfermedadesCronicas error: ' + 'El estado de la enfermedad debe ser: activa, controlada o en_remision'); 
        return;
      }
    }
  }

  /**
   * Valida la estructura de cirugías previas
   * @param {Array} cirugias 
   * @throws {AppError}
   */
  validarCirugiasPrevias(cirugias) {
    if (!Array.isArray(cirugias)) {
        logger.error('HistorialMedicoService.validarCirugiasPrevias error: ' + 'Las cirugías previas deben ser un array'); 
        return;
    }

    for (const cirugia of cirugias) {
      if (!cirugia.nombre || typeof cirugia.nombre !== 'string') {
        logger.error('HistorialMedicoService.validarCirugiasPrevias error: ' + 'Cada cirugía debe tener un nombre válido'); 
        return;
      }
      if (!cirugia.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(cirugia.fecha)) {
        logger.error('HistorialMedicoService.validarCirugiasPrevias error: ' + 'Cada cirugía debe tener una fecha válida en formato YYYY-MM-DD'); 
        return;
      }
    }
  }

  /**
   * Valida la estructura de medicamentos actuales
   * @param {Array} medicamentos 
   * @throws {AppError}
   */
  validarMedicamentosActuales(medicamentos) {
    if (!Array.isArray(medicamentos)) {
        logger.error('HistorialMedicoService.validarMedicamentosActuales error: ' + 'Los medicamentos actuales deben ser un array'); 
        return;
    }

    for (const medicamento of medicamentos) {
      if (!medicamento.nombre || typeof medicamento.nombre !== 'string') {
        logger.error('HistorialMedicoService.validarMedicamentosActuales error: ' + 'Cada medicamento debe tener un nombre válido'); 
        return;
      }
      if (!medicamento.dosis || typeof medicamento.dosis !== 'string') {
        logger.error('HistorialMedicoService.validarMedicamentosActuales error: ' + 'Cada medicamento debe tener una dosis válida'); 
        return;
      }
      if (!medicamento.frecuencia || typeof medicamento.frecuencia !== 'string') {
        logger.error('HistorialMedicoService.validarMedicamentosActuales error: ' + 'Cada medicamento debe tener una frecuencia válida'); 
        return;
      }
    }
  }

  /**
   * Obtiene el historial completo de un paciente
   * @param {string} medicoId - UUID del médico
   * @param {string} pacienteId - UUID del paciente
   * @returns {Promise<Object>}
   */
  async obtenerHistorial(medicoId, pacienteId) {
    // Verificar autorización
    const tieneAutorizacion = await historialMedicoRepository.verificarAutorizacion(medicoId, pacienteId);
    
    if (!tieneAutorizacion) {
        logger.error('HistorialMedicoService.obtenerHistorial error: ' + 'No tienes autorización para acceder a este historial. Debe existir al menos una cita con este paciente.'); 
        return null;
    }

    const historial = await historialMedicoRepository.obtenerHistorialCompleto(pacienteId);

    if (!historial) {
        logger.error('HistorialMedicoService.obtenerHistorial error: ' + 'Este paciente aún no tiene historial médico registrado'); 
        return null;
    }

    return historial;
  }

  /**
   * Crea o actualiza el historial médico de un paciente
   * @param {string} medicoId - UUID del médico
   * @param {string} pacienteId - UUID del paciente
   * @param {Object} data - Datos del historial
   * @returns {Promise<Object>}
   */
  async crearOActualizarHistorial(medicoId, pacienteId, data) {
    // Verificar autorización
    const tieneAutorizacion = await historialMedicoRepository.verificarAutorizacion(medicoId, pacienteId);
    
    if (!tieneAutorizacion) {
      logger.error('HistorialMedicoService.crearOActualizarHistorial error: ' + 'No tienes autorización para modificar este historial. Debe existir al menos una cita con este paciente.'); 
      return null;
    }

    // Validar estructuras JSONB si están presentes
    if (data.enfermedades_cronicas) {
      this.validarEnfermedadesCronicas(data.enfermedades_cronicas);
    }

    if (data.cirugias_previas) {
      this.validarCirugiasPrevias(data.cirugias_previas);
    }

    if (data.medicamentos_actuales) {
      this.validarMedicamentosActuales(data.medicamentos_actuales);
    }

    // Realizar upsert
    const historial = await historialMedicoRepository.upsert(pacienteId, {
      enfermedades_cronicas: data.enfermedades_cronicas || [],
      cirugias_previas: data.cirugias_previas || [],
      medicamentos_actuales: data.medicamentos_actuales || []
    });

    return historial;
  }

  /**
   * Actualiza parcialmente el historial médico
   * @param {string} medicoId - UUID del médico
   * @param {string} pacienteId - UUID del paciente
   * @param {Object} data - Datos parciales a actualizar
   * @returns {Promise<Object>}
   */
  async actualizarHistorialParcial(medicoId, pacienteId, data) {
    // Verificar autorización
    const tieneAutorizacion = await historialMedicoRepository.verificarAutorizacion(medicoId, pacienteId);
    
    if (!tieneAutorizacion) {
      logger.error('HistorialMedicoService.actualizarHistorialParcial error: ' + 'No tienes autorización para modificar este historial. Debe existir al menos una cita con este paciente.'); 
      return null;
    }

    // Obtener historial actual
    const historialActual = await historialMedicoRepository.obtenerHistorialBase(pacienteId);

    if (!historialActual) {
      logger.error('HistorialMedicoService.actualizarHistorialParcial error: ' + 'Este paciente no tiene historial médico. Debe crearlo primero.'); 
      return null;
    }

    // Validar solo los campos que se están actualizando
    if (data.enfermedades_cronicas) {
      this.validarEnfermedadesCronicas(data.enfermedades_cronicas);
    }

    if (data.cirugias_previas) {
      this.validarCirugiasPrevias(data.cirugias_previas);
    }

    if (data.medicamentos_actuales) {
      this.validarMedicamentosActuales(data.medicamentos_actuales);
    }

    const [, historialActualizado] = await historialMedicoRepository.actualizar(
      historialActual.id,
      data
    );

    return historialActualizado[0];
  }

  /**
   * Obtiene todos los pacientes de un médico con sus historiales
   * @param {string} medicoId - UUID del médico
   * @returns {Promise<Object[]>}
   */
  async obtenerPacientesConHistorial(medicoId) {
    return await historialMedicoRepository.obtenerPacientesConHistorial(medicoId);
  }
}

export default new HistorialMedicoService();