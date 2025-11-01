import productosService from '../services/productosService.js';
import logger from '../utils/logger.js';

class ProductosController {
  async consultarCatalogo(req, res) {
    try {
      const { search, category, page, limit } = req.query;
      const productos = await productosService.consultarCatalogo({ search, category, page, limit });
      return res.json({ success: true, data: productos });
    } catch (error) {
      logger.error('ProductosController.consultarCatalogo error: ' + error.message);
      return res.status(error.status || 500).json({ success: false, error: error.message });
    }
  }

  async procesarCompra(req, res) {
    try {
      const pacienteId = req.pacienteId || req.headers['x-paciente-id'];
      const { items } = req.body;
      if (!pacienteId) return res.status(401).json({ success: false, error: 'Paciente no autenticado' });
      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, error: 'items requeridos' });

      const resumen = await productosService.procesarCompra(pacienteId, items);
      return res.status(200).json({ success: true, data: resumen });
    } catch (error) {
      logger.error('ProductosController.procesarCompra error: ' + error.message);
      return res.status(error.status || 500).json({ success: false, error: error.message, details: error.details || null });
    }
  }
}

export default new ProductosController();
