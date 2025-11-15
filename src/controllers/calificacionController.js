import calificacionService from '../services/calificacionService.js';

class CalificacionController {
  // ==================== CALIFICACIONES DE MÉDICOS ====================
  
  /**
   * Crear calificación de médico (SOLO PACIENTES)
   * POST /api/calificaciones/medicos
   */
  async crearCalificacionMedico(req, res) {
    try {
      // ✅ CAMBIO CRÍTICO: El pacienteId viene de req.body.pacienteId (inyectado por la ruta)
      const pacienteId = req.body.pacienteId;
      const { medicoId, citaId, puntuacion, comentario } = req.body;

      // Validación de campos requeridos
      if (!pacienteId || !medicoId || !citaId || !puntuacion) {
        return res.status(400).json({
          error: 'Los campos medicoId, citaId y puntuacion son obligatorios'
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

  /**
   * Obtener calificación por ID (PÚBLICO)
   * GET /api/calificaciones/medicos/:id
   */
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

  /**
   * Obtener calificaciones de un médico (PÚBLICO)
   * GET /api/calificaciones/medicos/medico/:medicoId
   */
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

  /**
   * Obtener estadísticas de médico (PÚBLICO)
   * GET /api/calificaciones/medicos/medico/:medicoId/estadisticas
   */
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

  /**
   * Actualizar calificación de médico (SOLO PACIENTE DUEÑO)
   * PUT /api/calificaciones/medicos/:id
   */
  async actualizarCalificacionMedico(req, res) {
    try {
      const { id } = req.params;
      const pacienteId = req.body.pacienteId; // Inyectado por la ruta
      const { puntuacion, comentario } = req.body;

      if (!pacienteId) {
        return res.status(401).json({
          error: 'No autenticado'
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

  /**
   * Eliminar calificación de médico (SOLO PACIENTE DUEÑO)
   * DELETE /api/calificaciones/medicos/:id
   */
  async eliminarCalificacionMedico(req, res) {
    try {
      const { id } = req.params;
      const pacienteId = req.body.pacienteId; // Inyectado por la ruta

      if (!pacienteId) {
        return res.status(401).json({
          error: 'No autenticado'
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

  /**
   * Crear calificación de producto (SOLO PACIENTES)
   * POST /api/calificaciones/productos
   */
  async crearCalificacionProducto(req, res) {
    try {
      const pacienteId = req.body.pacienteId;
      const { productoId, compraId, puntuacion, comentario } = req.body;

      if (!pacienteId || !productoId || !compraId || !puntuacion) {
        return res.status(400).json({
          error: 'Los campos productoId, compraId y puntuacion son obligatorios'
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

  /**
   * Obtener calificación de producto por ID (PÚBLICO)
   * GET /api/calificaciones/productos/:id
   */
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

  /**
   * Obtener calificaciones de un producto (PÚBLICO)
   * GET /api/calificaciones/productos/producto/:productoId
   */
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

  /**
   * Obtener estadísticas de producto (PÚBLICO)
   * GET /api/calificaciones/productos/producto/:productoId/estadisticas
   */
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

  /**
   * Actualizar calificación de producto (SOLO PACIENTE DUEÑO)
   * PUT /api/calificaciones/productos/:id
   */
  async actualizarCalificacionProducto(req, res) {
    try {
      const { id } = req.params;
      const pacienteId = req.body.pacienteId;
      const { puntuacion, comentario } = req.body;

      if (!pacienteId) {
        return res.status(401).json({
          error: 'No autenticado'
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

  /**
   * Eliminar calificación de producto (SOLO PACIENTE DUEÑO)
   * DELETE /api/calificaciones/productos/:id
   */
  async eliminarCalificacionProducto(req, res) {
    try {
      const { id } = req.params;
      const pacienteId = req.body.pacienteId;

      if (!pacienteId) {
        return res.status(401).json({
          error: 'No autenticado'
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

  /**
   * Obtener todas las calificaciones del paciente autenticado
   * GET /api/calificaciones/mis-calificaciones
   */
  async obtenerCalificacionesPorPaciente(req, res) {
    try {
      const pacienteId = req.params.pacienteId;
      const { tipo = 'ambos' } = req.query;

      if (!pacienteId) {
        return res.status(401).json({
          error: 'No autenticado'
        });
      }

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