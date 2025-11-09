// controllers/medicoController.js
import MedicoService from '../services/medicoService.js';

class MedicoController {
  constructor() {
    this.service = new MedicoService();
  }

  /**
   * POST /api/medicos/:medicoId/disponibilidad
   * Configura la disponibilidad horaria de un médico
   */
  configurarDisponibilidad = async (req, res) => {
    try {
      const { medicoId } = req.params;
      const { disponibilidades } = req.body;

      if (!disponibilidades) {
        return res.status(400).json({
          error: 'El campo disponibilidades es requerido'
        });
      }

      const resultado = await this.service.configurarDisponibilidad(
        medicoId,
        disponibilidades
      );

      res.status(201).json({
        success: true,
        mensaje: 'Disponibilidad configurada exitosamente',
        data: resultado
      });

    } catch (error) {
      console.error('Error al configurar disponibilidad:', error);

      if (error.message === 'Médico no encontrado') {
        return res.status(404).json({ error: error.message });
      }

      if (error.message.includes('debe')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({
        error: 'Error al configurar disponibilidad',
        mensaje: error.message
      });
    }
  };

  /**
   * GET /api/medicos/:medicoId/disponibilidad
   * Obtiene la disponibilidad configurada de un médico
   */
  obtenerDisponibilidad = async (req, res) => {
    try {
      const { medicoId } = req.params;

      const disponibilidad = await this.service.obtenerDisponibilidad(medicoId);

      res.status(200).json({
        success: true,
        data: disponibilidad
      });

    } catch (error) {
      console.error('Error al obtener disponibilidad:', error);

      if (error.message === 'Médico no encontrado') {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({
        error: 'Error al obtener disponibilidad',
        mensaje: error.message
      });
    }
  };

  /**
   * GET /api/medicos
   * Lista médicos disponibles con filtros
   */
  listarMedicos = async (req, res) => {
    try {
      const filtros = {
        especialidad: req.query.especialidad,
        localidad: req.query.localidad,
        modalidad: req.query.modalidad,
        dia_semana: req.query.dia_semana ? parseInt(req.query.dia_semana) : undefined,
        calificacion_minima: req.query.calificacion_minima ? parseFloat(req.query.calificacion_minima) : undefined,
        costo_maximo: req.query.costo_maximo ? parseFloat(req.query.costo_maximo) : undefined,
        nombre: req.query.nombre,
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      };

      // Validar limit y offset
      if (filtros.limit > 100) {
        return res.status(400).json({
          error: 'El límite máximo es 100'
        });
      }

      if (filtros.dia_semana !== undefined && (filtros.dia_semana < 0 || filtros.dia_semana > 6)) {
        return res.status(400).json({
          error: 'El día de semana debe estar entre 0 (Domingo) y 6 (Sábado)'
        });
      }

      const resultado = await this.service.listarMedicosDisponibles(filtros);

      res.status(200).json({
        success: true,
        data: resultado
      });

    } catch (error) {
      console.error('Error al listar médicos:', error);
      res.status(500).json({
        error: 'Error al listar médicos',
        mensaje: error.message
      });
    }
  };

  /**
   * GET /api/medicos/:medicoId
   * Obtiene el detalle completo de un médico
   */
  obtenerDetalle = async (req, res) => {
    try {
      const { medicoId } = req.params;
      const incluirCalificaciones = req.query.incluir_calificaciones !== 'false';

      const medico = await this.service.obtenerDetalleMedico(
        medicoId,
        incluirCalificaciones
      );

      res.status(200).json({
        success: true,
        data: medico
      });

    } catch (error) {
      console.error('Error al obtener detalle del médico:', error);

      if (error.message === 'Médico no encontrado') {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({
        error: 'Error al obtener detalle del médico',
        mensaje: error.message
      });
    }
  };
}

export default MedicoController;