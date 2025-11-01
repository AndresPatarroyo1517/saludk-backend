import productosService from '../services/productosService.js';
import logger from '../utils/logger.js';

class ProductosController {
  /**
   * Consulta el catálogo de productos
   * GET /api/productos?search=&category=&page=&limit=
   */
  async consultarCatalogo(req, res) {
    try {
      const { search, category, page, limit } = req.query;
      const productos = await productosService.consultarCatalogo({ search, category, page, limit });
      
      return res.json({ 
        success: true, 
        data: productos 
      });

    } catch (error) {
      logger.error('❌ ProductosController.consultarCatalogo error: ' + error.message);
      return res.status(error.status || 500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  /**
   * Procesa una compra de productos
   * POST /api/productos/comprar
   * 
   * Body:
   * {
   *   items: [{ productId: "uuid", cantidad: 2 }],
   *   metodoPago: "TARJETA" | "PASARELA" | "CONSIGNACION"
   * }
   * 
   * Headers:
   * x-paciente-id: "uuid"
   */
  async procesarCompra(req, res) {
    try {
      const pacienteId = req.pacienteId || req.headers['x-paciente-id'];
      const { items, metodoPago = 'TARJETA' } = req.body;

      if (!pacienteId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Paciente no autenticado' 
        });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'items requeridos' 
        });
      }

      logger.info(`🛒 Procesando compra para paciente ${pacienteId} | Items: ${items.length} | Método: ${metodoPago}`);

      const resumen = await productosService.procesarCompra(pacienteId, items, metodoPago);

      // Preparar respuesta según método de pago
      const response = {
        success: true,
        message: 'Compra procesada correctamente.',
        data: {
          compra: resumen.compra,
          ordenPago: resumen.ordenPago
        }
      };

      // Para TARJETA: incluir clientSecret para Stripe
      if (resumen.stripe) {
        response.data.stripe = resumen.stripe;
        response.message = 'Compra creada. Procede con el pago usando el clientSecret.';
        response.instrucciones = 'Usa Stripe Elements en el frontend con el clientSecret proporcionado.';
      }

      // Para PSE: incluir referencia
      if (resumen.pse) {
        response.data.pse = resumen.pse;
        response.message = 'Compra creada. ' + resumen.pse.mensaje;
      }

      // Para CONSIGNACION: incluir instrucciones
      if (resumen.consignacion) {
        response.data.consignacion = resumen.consignacion;
        response.message = 'Compra creada. Realiza la consignación con los datos proporcionados.';
      }

      return res.status(200).json(response);

    } catch (error) {
      logger.error('❌ ProductosController.procesarCompra error: ' + error.message);
      return res.status(error.status || 500).json({ 
        success: false, 
        error: error.message, 
        details: error.details || null 
      });
    }
  }
}

export default new ProductosController();
