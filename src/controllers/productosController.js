import productosService from '../services/productosService.js';
import compraPromocionService from '../services/compraPromocionService.js';
import logger from '../utils/logger.js';

class ProductosController {
  /**
   * Consulta el catálogo de productos (PÚBLICO)
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
   * Procesa una compra de productos (SOLO PACIENTES AUTENTICADOS)
   * POST /api/productos/compra
   * 
   * Body:
   * {
   *   items: [{ productId: "uuid", cantidad: 2 }],
   *   metodoPago: "TARJETA" | "PSE" | "CONSIGNACION",
   *   codigoPromocion: "CODIGO123" (opcional),
   *   direccion_entrega_id: "uuid"
   * }
   */
  async procesarCompra(req, res) {
    try {
      // ✅ CAMBIO CRÍTICO: El pacienteId viene de req.body.pacienteId (inyectado por la ruta)
      const pacienteId = req.body.pacienteId;
      const { items, metodoPago = 'TARJETA', codigoPromocion = null, direccion_entrega_id } = req.body;

      if (!pacienteId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Paciente no autenticado' 
        });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'items requeridos (debe ser un array con al menos un producto)' 
        });
      }

      if (!direccion_entrega_id) {
        return res.status(400).json({
          success: false,
          error: 'direccion_entrega_id es requerido'
        });
      }

      logger.info(`🛒 Procesando compra para paciente ${pacienteId} | Items: ${items.length} | Método: ${metodoPago}`);

      let resumen = await productosService.procesarCompra(pacienteId, items, metodoPago, direccion_entrega_id);
      let montoFinal = resumen.compra.total;
      let descuentoAplicado = 0;
      let promocionData = null;

      // Si se proporcionó código de promoción, intentar aplicarlo
      if (codigoPromocion) {
        logger.info(`💳 Intentando aplicar promoción: ${codigoPromocion}`);
        const resultadoPromocion = await compraPromocionService.aplicarCodigoPromocion(
          codigoPromocion,
          pacienteId,
          montoFinal
        );

        if (resultadoPromocion.valida) {
          descuentoAplicado = resultadoPromocion.descuentoAplicado;
          montoFinal = resultadoPromocion.montoFinal;
          promocionData = {
            codigoPromocion,
            nombre: resultadoPromocion.promocion.nombre,
            porcentajeDescuento: resultadoPromocion.promocion.valor_descuento,
            descuentoAplicado,
            montoFinal
          };
          logger.info(`✅ Promoción aplicada: -$${descuentoAplicado}`);
        } else {
          logger.warn(`❌ Promoción no válida: ${resultadoPromocion.error}`);
          return res.status(400).json({
            success: false,
            error: resultadoPromocion.error
          });
        }
      }

      // Preparar respuesta según método de pago
      const response = {
        success: true,
        message: 'Compra procesada correctamente.',
        data: {
          compra: resumen.compra,
          ordenPago: resumen.ordenPago,
          montoFinal,
          descuentoAplicado,
          promocion: promocionData
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

  /**
   * Obtiene el historial de compras del paciente autenticado
   * GET /api/productos/mis-compras
   */
  async obtenerMisCompras(req, res) {
    try {
      const pacienteId = req.query.pacienteId; // Inyectado por la ruta

      if (!pacienteId) {
        return res.status(401).json({
          success: false,
          error: 'Paciente no autenticado'
        });
      }

      const { estado, limit = 20, offset = 0 } = req.query;

      const compras = await productosService.obtenerComprasPorPaciente(
        pacienteId,
        { estado, limit: parseInt(limit), offset: parseInt(offset) }
      );

      return res.json({
        success: true,
        data: compras
      });

    } catch (error) {
      logger.error('❌ ProductosController.obtenerMisCompras error: ' + error.message);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new ProductosController();