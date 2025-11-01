import { sequelize } from '../database/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../utils/logger.js';

/**
 * ProveedorAdapter (mock)
 * - consultarDisponibilidad(products): given array of product ids or objects, returns map with cantidad_disponible
 */

const consultarDisponibilidad = async (productIds = []) => {
  try {
    if (!productIds || productIds.length === 0) return {};

    const ids = productIds.map(id => `'${id}'`).join(',');
    const sql = `SELECT producto_id, cantidad_disponible FROM public.stock WHERE producto_id IN (${ids})`;

    const rows = await sequelize.query(sql, { type: QueryTypes.SELECT });

    const map = {};
    for (const r of rows) {
      map[r.producto_id] = Number(r.cantidad_disponible || 0);
    }

    return map;
  } catch (error) {
    logger.error('ProveedorAdapter.consultarDisponibilidad error: ' + error.message);
    // Fallback: assume 0 availability
    return {};
  }
};

export default { consultarDisponibilidad };
