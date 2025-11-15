import RecomendacionesService from '../services/recomendacionesService.js';

class RecomendacionesController {
  /**
   * Obtiene recomendaciones de productos para el paciente autenticado
   * GET /api/productos/recomendaciones
   */
  async obtenerRecomendaciones(req, res) {
    try {
      // ✅ CAMBIO CRÍTICO: El userId viene de req.params.userId (inyectado por la ruta)
      const userId = req.params.userId;

      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'userId es requerido' 
        });
      }

      const recomendaciones = await RecomendacionesService.obtenerRecomendaciones(userId);

      return res.json({
        success: true,
        data: {
          userId,
          total: recomendaciones.length,
          recomendaciones
        }
      });

    } catch (err) {
      return res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    }
  }

  /**
   * Obtiene productos similares a uno específico
   * GET /api/productos/:productoId/similares
   */
  async obtenerProductosSimilares(req, res) {
    try {
      const { productoId } = req.params;

      if (!productoId) {
        return res.status(400).json({ 
          success: false, 
          error: 'productoId es requerido' 
        });
      }

      const similares = await RecomendacionesService.obtenerProductosSimilares(productoId);

      return res.json({
        success: true,
        data: {
          productoId,
          total: similares.length,
          similares
        }
      });

    } catch (err) {
      return res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    }
  }
}

export default new RecomendacionesController();