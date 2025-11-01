import { sequelize } from '../database/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../utils/logger.js';

/**
 * ProductoRepository
 * - findAll(filters): returns list of active products with stock and metadata
 */

const buildWhereClause = ({ search, category }) => {
  const clauses = ['p.activo = true'];
  if (category) {
    clauses.push("p.categoria = :category");
  }
  if (search) {
    clauses.push("(p.nombre ILIKE :search OR p.codigo_producto ILIKE :search)");
  }
  return clauses.length ? clauses.join(' AND ') : '1=1';
};

const findAll = async ({ search, category, page = 1, limit = 20 } = {}) => {
  try {
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const where = buildWhereClause({ search, category });

    const sql = `
      SELECT p.id, p.codigo_producto, p.nombre, p.descripcion, p.precio, p.categoria, p.marca,
             p.ingredientes, p.efectos_secundarios, p.imagen_url, p.requiere_receta, p.activo,
             COALESCE(s.cantidad_disponible, 0) AS cantidad_disponible
      FROM public.producto_farmaceutico p
      LEFT JOIN public.stock s ON s.producto_id = p.id
      WHERE ${where}
      ORDER BY p.nombre ASC
      LIMIT :limit OFFSET :offset
    `;

    const replacements = {
      search: search ? `%${search}%` : undefined,
      category: category || undefined,
      limit: Number(limit),
      offset: Number(offset),
    };

    const products = await sequelize.query(sql, {
      type: QueryTypes.SELECT,
      replacements,
    });

    return products.map(p => ({
      id: p.id,
      codigo: p.codigo_producto,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: Number(p.precio),
      categoria: p.categoria,
      marca: p.marca,
      ingredientes: p.ingredientes || [],
      efectos_secundarios: p.efectos_secundarios || [],
      imagen_url: p.imagen_url,
      requiere_receta: p.requiere_receta,
      activo: p.activo,
      cantidad_disponible: Number(p.cantidad_disponible || 0),
    }));
  } catch (error) {
    logger.error('ProductoRepository.findAll error: ' + error.message);
    throw error;
  }
};

export default { findAll };
