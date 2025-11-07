import db from "../models/index.js";
import { sequelize } from '../database/database.js';
import { QueryTypes, Op, fn, col } from 'sequelize';
const { Compra, CalificacionProducto } = db;

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


export const sumRevenueTotal = async (
  { from, to },
  opts = { dateField: 'fecha_pago', estados: ['PAGADA', 'ENTREGADA'], currency: 'COP' }
) => {
  const dateField = opts?.dateField ?? 'fecha_pago';
  const estados = opts?.estados ?? ['PAGADA', 'ENTREGADA'];
  const currency = opts?.currency ?? 'COP';

  const row = await Compra.findOne({
    attributes: [[fn('COALESCE', fn('SUM', col('total')), 0), 'total']],
    where: {
      [dateField]: { [Op.between]: [from, to] },
      ...(estados?.length ? { estado: { [Op.in]: estados } } : {})
    },
    raw: true
  });

  return { total: Number(row?.total ?? 0), currency };
};


export const avgRating = async (
  { from, to },
  opts = { onlyPaidPurchases: true, purchaseValidStates: ['PAGADA', 'ENTREGADA'], purchaseDateField: 'fecha_pago', productoId: undefined, minScore: undefined, maxScore: undefined }
) => {
  const include = [];
  if (opts?.onlyPaidPurchases) {
    const states = opts?.purchaseValidStates?.length ? opts.purchaseValidStates : ['PAGADA', 'ENTREGADA'];
    const dateField = opts?.purchaseDateField ?? 'fecha_pago';
    include.push({
      model: Compra,
      as: 'compra',
      attributes: [],
      where: {
        ...(dateField ? { [dateField]: { [Op.between]: [from, to] } } : {}),
        estado: { [Op.in]: states }
      }
    });
  }

  const where = {
    fecha_creacion: { [Op.between]: [from, to] },
    ...(opts?.productoId ? { producto_id: opts.productoId } : {})
  };

  if (opts?.minScore != null || opts?.maxScore != null) {
    where.puntuacion = {
      ...(opts?.minScore != null ? { [Op.gte]: opts.minScore } : {}),
      ...(opts?.maxScore != null ? { [Op.lte]: opts.maxScore } : {})
    };
  }

  const row = await CalificacionProducto.findOne({
    attributes: [[fn('AVG', col('puntuacion')), 'avg']],
    where,
    ...(include.length ? { include } : {}),
    raw: true
  });

  const v = row?.avg;
  return v == null ? null : Math.round(Number(v) * 100) / 100; // escala 1–10
};

export default { findAll, sumRevenueTotal, avgRating };
