import RecomendacionesService from '../services/recomendacionesService.js';

class RecomendacionesController {
  async obtenerRecomendaciones(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId es requerido' });
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
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async obtenerProductosSimilares(req, res) {
    try {
      const { productoId } = req.params;

      if (!productoId) {
        return res.status(400).json({ success: false, error: 'productoId es requerido' });
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
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default new RecomendacionesController();
