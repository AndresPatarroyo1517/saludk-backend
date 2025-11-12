import db from '../models/index.js';
import logger from '../utils/logger.js';

class RecomendacionesService {
  /**
   * Obtiene recomendaciones de productos para un usuario basado en su historial de compras
   * @param {string} pacienteId - ID del paciente
   * @returns {Promise<Array>} Lista de productos recomendados
   */
  async obtenerRecomendaciones(pacienteId) {
    try {
      // 1. Obtener historial de compras del paciente
      const compras = await db.Compra.findAll({
        where: { paciente_id: pacienteId },
        include: [
          {
            model: db.CompraProducto,
            as: 'productos',
            include: [
              {
                model: db.ProductoFarmaceutico,
                as: 'producto'
              }
            ]
          }
        ],
        order: [['fecha_creacion', 'DESC']]
      });

      if (compras.length === 0) {
        logger.info(`No hay compras previas para el paciente ${pacienteId}`);
        return [];
      }

      // 2. Extraer categorías y nombres de productos comprados
      const productosComprados = new Set();
      const categoriasCompradas = new Set();
      const nombresProductos = [];

      for (const compra of compras) {
        if (compra.productos && compra.productos.length > 0) {
          for (const cp of compra.productos) {
            if (cp.producto) {
              productosComprados.add(cp.producto.id);
              if (cp.producto.categoria) {
                categoriasCompradas.add(cp.producto.categoria);
              }
              nombresProductos.push(cp.producto.nombre);
            }
          }
        }
      }

      // 3. Buscar productos similares (por categoría o similitud de nombre)
      const recomendaciones = await db.ProductoFarmaceutico.findAll({
        where: {
          id: {
            [db.Sequelize.Op.notIn]: Array.from(productosComprados)
          }
        },
        include: [
          {
            model: db.Stock,
            as: 'stock'
          }
        ],
        limit: 10
      });

      // 4. Filtrar y rankear por similitud (categoría y nombre)
      const productosRankeados = recomendaciones
        .map(prod => {
          let score = 0;

          // Puntuación por categoría
          if (categoriasCompradas.has(prod.categoria)) {
            score += 10;
          }

          // Puntuación por similitud de nombre (palabras clave)
          for (const nombreComp of nombresProductos) {
            if (prod.nombre && nombreComp) {
              const palabrasComp = nombreComp.toLowerCase().split(/\s+/);
              const palabrasProd = prod.nombre.toLowerCase().split(/\s+/);

              for (const pc of palabrasComp) {
                for (const pp of palabrasProd) {
                  if (pc === pp && pc.length > 3) {
                    score += 5;
                  }
                }
              }
            }
          }

          // Stock disponible
          const stockDisponible = prod.stock?.cantidad_disponible ?? 0;

          return {
            ...prod.dataValues,
            recomendacion_score: score,
            disponible: stockDisponible > 0
          };
        })
        .filter(p => p.recomendacion_score > 0 || categoriasCompradas.has(p.categoria))
        .sort((a, b) => b.recomendacion_score - a.recomendacion_score)
        .slice(0, 10);

      return productosRankeados;
    } catch (err) {
      logger.error('Error obteniendo recomendaciones:', err.message);
      throw err;
    }
  }

  /**
   * Obtiene productos similares a uno específico
   * @param {string} productoId - ID del producto
   * @returns {Promise<Array>} Lista de productos similares
   */
  async obtenerProductosSimilares(productoId) {
    try {
      const producto = await db.ProductoFarmaceutico.findByPk(productoId);

      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      const similares = await db.ProductoFarmaceutico.findAll({
        where: {
          id: { [db.Sequelize.Op.ne]: productoId },
          categoria: producto.categoria
        },
        include: [
          {
            model: db.Stock,
            as: 'stock'
          }
        ],
        limit: 5
      });

      return similares.map(p => ({
        ...p.dataValues,
        disponible: (p.stock?.cantidad_disponible ?? 0) > 0
      }));
    } catch (err) {
      logger.error('Error obteniendo productos similares:', err.message);
      throw err;
    }
  }
}

export default new RecomendacionesService();
