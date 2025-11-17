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
   */
  async procesarCompra(req, res) {
    try {
      // El pacienteId viene de req.user.paciente.id (authMiddleware + requirePaciente)
      const pacienteId = req.user.paciente.id;
      const { items, metodoPago = 'TARJETA_CREDITO', codigoPromocion = null, direccion_entrega_id } = req.body;

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

      // Para TARJETA_CREDITO: incluir clientSecret para Stripe
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
   * Confirma una compra después del pago exitoso
   * POST /api/productos/compra/:compraId/confirmar
   */
  async confirmarCompra(req, res) {
    try {
      const { compraId } = req.params;

      if (!compraId) {
        return res.status(400).json({
          success: false,
          error: 'compraId requerido'
        });
      }

      logger.info(`✅ Confirmando compra ${compraId}`);

      const resultado = await productosService.confirmarCompra(compraId);

      return res.json({
        success: true,
        message: 'Compra confirmada exitosamente',
        data: resultado
      });

    } catch (error) {
      logger.error('❌ ProductosController.confirmarCompra error: ' + error.message);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Cambia el estado de una compra
   * PATCH /api/productos/compra/:compraId/estado
   */
  async cambiarEstadoCompra(req, res) {
    try {
      const { compraId } = req.params;
      const { nuevoEstado } = req.body;
      const usuarioId = req.user?.userId;

      if (!compraId) {
        return res.status(400).json({
          success: false,
          error: 'compraId requerido'
        });
      }

      if (!nuevoEstado) {
        return res.status(400).json({
          success: false,
          error: 'nuevoEstado requerido'
        });
      }

      logger.info(`🔄 Cambiando estado de compra ${compraId} a ${nuevoEstado}`);

      const resultado = await productosService.cambiarEstadoCompra(compraId, nuevoEstado, usuarioId);

      return res.json({
        success: true,
        message: `Estado actualizado a ${nuevoEstado}`,
        data: resultado
      });

    } catch (error) {
      logger.error('❌ ProductosController.cambiarEstadoCompra error: ' + error.message);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Cancela una compra
   * POST /api/productos/compra/:compraId/cancelar
   */
  async cancelarCompra(req, res) {
    try {
      const { compraId } = req.params;
      const { motivo } = req.body;
      const usuarioId = req.user?.userId;
      const pacienteId = req.user?.paciente?.id;

      if (!compraId) {
        return res.status(400).json({
          success: false,
          error: 'compraId requerido'
        });
      }

      // Verificar que la compra pertenece al paciente (si es paciente quien cancela)
      if (pacienteId) {
        const compra = await productosService.obtenerDetalleCompra(compraId);
        if (compra.paciente_id !== pacienteId) {
          return res.status(403).json({
            success: false,
            error: 'No tienes permiso para cancelar esta compra'
          });
        }
      }

      logger.info(`❌ Cancelando compra ${compraId}. Motivo: ${motivo || 'No especificado'}`);

      const resultado = await productosService.cancelarCompra(compraId, motivo, usuarioId);

      return res.json({
        success: true,
        message: 'Compra cancelada exitosamente',
        data: resultado
      });

    } catch (error) {
      logger.error('❌ ProductosController.cancelarCompra error: ' + error.message);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene el detalle completo de una compra
   * GET /api/productos/compra/:compraId
   */
  async obtenerDetalleCompra(req, res) {
    try {
      const { compraId } = req.params;
      const pacienteId = req.user?.paciente?.id;

      if (!compraId) {
        return res.status(400).json({
          success: false,
          error: 'compraId requerido'
        });
      }

      const compra = await productosService.obtenerDetalleCompra(compraId);

      // Si es un paciente, verificar que la compra le pertenece
      if (pacienteId && compra.paciente_id !== pacienteId) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permiso para ver esta compra'
        });
      }

      return res.json({
        success: true,
        data: compra
      });

    } catch (error) {
      logger.error('❌ ProductosController.obtenerDetalleCompra error: ' + error.message);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene el historial de compras del paciente autenticado
   * GET /api/productos/mis-compras?estado=&limit=&offset=
   */
  async obtenerMisCompras(req, res) {
    try {
      const pacienteId = req.user.paciente.id;

      const { estado, limit = 20, offset = 0 } = req.query;

      const compras = await productosService.obtenerComprasPorPaciente(
        pacienteId,
        { estado, limit: parseInt(limit), offset: parseInt(offset) }
      );

      return res.json({
        success: true,
        data: {
          compras,
          total: compras.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
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