import calificacionService from '../services/calificacionService.js';

class CalificacionController {
  // ==================== CALIFICACIONES DE MÉDICOS ====================
  
  async crearCalificacionMedico(req, res) {
    try {
      const { pacienteId, medicoId, citaId, puntuacion, comentario } = req.body;

      // Validación de campos requeridos
      if (!pacienteId || !medicoId || !citaId || !puntuacion) {
        return res.status(400).json({
          error: 'Los campos pacienteId, medicoId, citaId y puntuacion son obligatorios'
        });
      }

      const calificacion = await calificacionService.crearCalificacionMedico({
        pacienteId,
        medicoId,
        citaId,
        puntuacion: parseInt(puntuacion),
        comentario
      });

      return res.status(201).json({
        mensaje: 'Calificación creada exitosamente',
        data: calificacion
      });

    } catch (error) {
      console.error('Error al crear calificación de médico:', error);
      return res.status(400).json({
        error: error.message || 'Error al crear la calificación'
      });
    }
  }

  async obtenerCalificacionMedicoPorId(req, res) {
    try {
      const { id } = req.params;

      const calificacion = await calificacionService.obtenerCalificacionMedicoPorId(id);

      return res.status(200).json({
        data: calificacion
      });

    } catch (error) {
      console.error('Error al obtener calificación:', error);
      return res.status(404).json({
        error: error.message || 'Calificación no encontrada'
      });
    }
  }

  async obtenerCalificacionesPorMedico(req, res) {
    try {
      const { medicoId } = req.params;
      const { 
        puntuacionMin, 
        puntuacionMax, 
        fechaDesde, 
        fechaHasta,
        limit = 50, 
        offset = 0 
      } = req.query;

      const filtros = {
        puntuacionMin: puntuacionMin ? parseInt(puntuacionMin) : undefined,
        puntuacionMax: puntuacionMax ? parseInt(puntuacionMax) : undefined,
        fechaDesde,
        fechaHasta,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const resultado = await calificacionService.obtenerCalificacionesPorMedico(medicoId, filtros);

      return res.status(200).json(resultado);

    } catch (error) {
      console.error('Error al obtener calificaciones:', error);
      return res.status(500).json({
        error: 'Error al obtener las calificaciones'
      });
    }
  }

  async obtenerEstadisticasMedico(req, res) {
    try {
      const { medicoId } = req.params;

      const estadisticas = await calificacionService.obtenerEstadisticasMedico(medicoId);

      return res.status(200).json({
        data: estadisticas
      });

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return res.status(500).json({
        error: 'Error al obtener las estadísticas'
      });
    }
  }

  async actualizarCalificacionMedico(req, res) {
    try {
      const { id } = req.params;
      const { pacienteId, puntuacion, comentario } = req.body;

      if (!pacienteId) {
        return res.status(400).json({
          error: 'El campo pacienteId es obligatorio'
        });
      }

      const calificacion = await calificacionService.actualizarCalificacionMedico(
        id,
        { 
          puntuacion: puntuacion ? parseInt(puntuacion) : undefined, 
          comentario 
        },
        pacienteId
      );

      return res.status(200).json({
        mensaje: 'Calificación actualizada exitosamente',
        data: calificacion
      });

    } catch (error) {
      console.error('Error al actualizar calificación:', error);
      return res.status(400).json({
        error: error.message || 'Error al actualizar la calificación'
      });
    }
  }

  async eliminarCalificacionMedico(req, res) {
    try {
      const { id } = req.params;
      const { pacienteId } = req.body;

      if (!pacienteId) {
        return res.status(400).json({
          error: 'El campo pacienteId es obligatorio'
        });
      }

      const resultado = await calificacionService.eliminarCalificacionMedico(id, pacienteId);

      return res.status(200).json(resultado);

    } catch (error) {
      console.error('Error al eliminar calificación:', error);
      return res.status(400).json({
        error: error.message || 'Error al eliminar la calificación'
      });
    }
  }

  // ==================== CALIFICACIONES DE PRODUCTOS ====================

  async crearCalificacionProducto(req, res) {
    try {
      const { pacienteId, productoId, compraId, puntuacion, comentario } = req.body;

      // Validación de campos requeridos
      if (!pacienteId || !productoId || !compraId || !puntuacion) {
        return res.status(400).json({
          error: 'Los campos pacienteId, productoId, compraId y puntuacion son obligatorios'
        });
      }

      const calificacion = await calificacionService.crearCalificacionProducto({
        pacienteId,
        productoId,
        compraId,
        puntuacion: parseInt(puntuacion),
        comentario
      });

      return res.status(201).json({
        mensaje: 'Calificación creada exitosamente',
        data: calificacion
      });

    } catch (error) {
      console.error('Error al crear calificación de producto:', error);
      return res.status(400).json({
        error: error.message || 'Error al crear la calificación'
      });
    }
  }

  async obtenerCalificacionProductoPorId(req, res) {
    try {
      const { id } = req.params;

      const calificacion = await calificacionService.obtenerCalificacionProductoPorId(id);

      return res.status(200).json({
        data: calificacion
      });

    } catch (error) {
      console.error('Error al obtener calificación:', error);
      return res.status(404).json({
        error: error.message || 'Calificación no encontrada'
      });
    }
  }

  async obtenerCalificacionesPorProducto(req, res) {
    try {
      const { productoId } = req.params;
      const { 
        puntuacionMin, 
        puntuacionMax, 
        fechaDesde, 
        fechaHasta,
        limit = 50, 
        offset = 0 
      } = req.query;

      const filtros = {
        puntuacionMin: puntuacionMin ? parseInt(puntuacionMin) : undefined,
        puntuacionMax: puntuacionMax ? parseInt(puntuacionMax) : undefined,
        fechaDesde,
        fechaHasta,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const resultado = await calificacionService.obtenerCalificacionesPorProducto(productoId, filtros);

      return res.status(200).json(resultado);

    } catch (error) {
      console.error('Error al obtener calificaciones:', error);
      return res.status(500).json({
        error: 'Error al obtener las calificaciones'
      });
    }
  }

  async obtenerEstadisticasProducto(req, res) {
    try {
      const { productoId } = req.params;

      const estadisticas = await calificacionService.obtenerEstadisticasProducto(productoId);

      return res.status(200).json({
        data: estadisticas
      });

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return res.status(500).json({
        error: 'Error al obtener las estadísticas'
      });
    }
  }

  async actualizarCalificacionProducto(req, res) {
    try {
      const { id } = req.params;
      const { pacienteId, puntuacion, comentario } = req.body;

      if (!pacienteId) {
        return res.status(400).json({
          error: 'El campo pacienteId es obligatorio'
        });
      }

      const calificacion = await calificacionService.actualizarCalificacionProducto(
        id,
        { 
          puntuacion: puntuacion ? parseInt(puntuacion) : undefined, 
          comentario 
        },
        pacienteId
      );

      return res.status(200).json({
        mensaje: 'Calificación actualizada exitosamente',
        data: calificacion
      });

    } catch (error) {
      console.error('Error al actualizar calificación:', error);
      return res.status(400).json({
        error: error.message || 'Error al actualizar la calificación'
      });
    }
  }

  async eliminarCalificacionProducto(req, res) {
    try {
      const { id } = req.params;
      const { pacienteId } = req.body;

      if (!pacienteId) {
        return res.status(400).json({
          error: 'El campo pacienteId es obligatorio'
        });
      }

      const resultado = await calificacionService.eliminarCalificacionProducto(id, pacienteId);

      return res.status(200).json(resultado);

    } catch (error) {
      console.error('Error al eliminar calificación:', error);
      return res.status(400).json({
        error: error.message || 'Error al eliminar la calificación'
      });
    }
  }

  // ==================== MÉTODOS GENERALES ====================

  async obtenerCalificacionesPorPaciente(req, res) {
    try {
      const { pacienteId } = req.params;
      const { tipo = 'ambos' } = req.query;

      if (!['medicos', 'productos', 'ambos'].includes(tipo)) {
        return res.status(400).json({
          error: 'El parámetro tipo debe ser: medicos, productos o ambos'
        });
      }

      const calificaciones = await calificacionService.obtenerCalificacionesPorPaciente(
        pacienteId, 
        tipo
      );

      return res.status(200).json({
        data: calificaciones
      });

    } catch (error) {
      console.error('Error al obtener calificaciones del paciente:', error);
      return res.status(500).json({
        error: 'Error al obtener las calificaciones'
      });
    }
  }
}

export default new CalificacionController();