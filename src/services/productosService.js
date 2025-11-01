import productoRepository from '../repositories/productoRepository.js';
import proveedorAdapter from '../jobs/proveedorAdapter.js';
import db from '../models/index.js';
import logger from '../utils/logger.js';
import { sequelize } from '../database/database.js';
import { v4 as uuidv4 } from 'uuid';
import { QueryTypes } from 'sequelize';

/**
 * ProductosService
 */

const consultarCatalogo = async (options = {}) => {
  const { search, category, page, limit } = options;
  const products = await productoRepository.findAll({ search, category, page, limit });

  // Consultar disponibilidad externa (stock)
  const ids = products.map(p => p.id);
  const disponibilidadMap = await proveedorAdapter.consultarDisponibilidad(ids);

  return products.map(p => ({
    ...p,
    disponible: (disponibilidadMap[p.id] || p.cantidad_disponible || 0) > 0,
    cantidad_disponible: disponibilidadMap[p.id] ?? p.cantidad_disponible ?? 0,
  }));
};

const procesarCompra = async (pacienteId, items = []) => {
  // items: [{ productId, cantidad }]
  try {
    // 1) verificar suscripción activa
    const today = new Date().toISOString().slice(0,10);
    const suscripcion = await db.Suscripcion.findOne({
      where: {
        paciente_id: pacienteId,
      }
    });

    if (!suscripcion) {
      const e = new Error('Paciente sin suscripción');
      e.status = 403;
      throw e;
    }

    if (suscripcion.estado === 'PENDIENTE_PAGO' || new Date(suscripcion.fecha_vencimiento) < new Date(today)) {
      const e = new Error('Suscripción no activa o vencida');
      e.status = 403;
      throw e;
    }

    // 2) verificar disponibilidad
    const ids = items.map(i => i.productId);
    const disponibilidadMap = await proveedorAdapter.consultarDisponibilidad(ids);

    const unavailable = [];
    let total = 0;

    // get product details to calculate price
    const catalog = await productoRepository.findAll({});
    const catalogMap = Object.fromEntries(catalog.map(p => [p.id, p]));

    for (const it of items) {
      const stock = disponibilidadMap[it.productId] ?? (catalogMap[it.productId]?.cantidad_disponible ?? 0);
      if ((stock) < (it.cantidad || 1)) {
        unavailable.push({ productId: it.productId, requested: it.cantidad || 1, available: stock });
      } else {
        const price = catalogMap[it.productId]?.precio ?? 0;
        total += price * (it.cantidad || 1);
      }
    }

    if (unavailable.length) {
      const e = new Error('Algunos productos no están disponibles en la cantidad solicitada');
      e.status = 409;
      e.details = unavailable;
      throw e;
    }

    // 3) persistir compra y items dentro de una transacción
    const t = await sequelize.transaction();
    try {
      const compraId = uuidv4();
      const numeroOrden = `ORD-${Date.now().toString(36)}-${uuidv4().slice(0, 6)}`;

      const subtotal = total; // no discounts applied yet
      const descuento = 0.0;
      const totalFinal = subtotal - descuento;

      const insertCompraSql = `
        INSERT INTO public.compra (id, paciente_id, numero_orden, subtotal, descuento, total, estado, tipo_entrega, fecha_creacion)
        VALUES (:id, :pacienteId, :numeroOrden, :subtotal, :descuento, :total, :estado, :tipoEntrega, now())
      `;

      await sequelize.query(insertCompraSql, {
        replacements: {
          id: compraId,
          pacienteId,
          numeroOrden,
          subtotal,
          descuento,
          total: totalFinal,
          estado: 'PENDIENTE',
          tipoEntrega: 'DOMICILIO',
        },
        transaction: t,
      });

      // insertar items y decrementar stock
      for (const it of items) {
        const prod = catalogMap[it.productId];
        const precioUnit = prod?.precio ?? 0;
        const cantidad = Number(it.cantidad || 1);
        const subtotalItem = precioUnit * cantidad;

        const compraProductoId = uuidv4();
        const insertItemSql = `
          INSERT INTO public.compra_producto (id, compra_id, producto_id, cantidad, precio_unitario, descuento_aplicado, subtotal)
          VALUES (:id, :compraId, :productoId, :cantidad, :precioUnitario, :descuentoAplicado, :subtotal)
        `;

        await sequelize.query(insertItemSql, {
          replacements: {
            id: compraProductoId,
            compraId,
            productoId: it.productId,
            cantidad,
            precioUnitario: precioUnit,
            descuentoAplicado: 0.0,
            subtotal: subtotalItem,
          },
          transaction: t,
        });

        const updateStockSql = `
          UPDATE public.stock
          SET cantidad_disponible = cantidad_disponible - :cantidad
          WHERE producto_id = :productoId AND cantidad_disponible >= :cantidad
        `;

        await sequelize.query(updateStockSql, {
          replacements: { productoId: it.productId, cantidad },
          transaction: t,
        });

        // verify remaining stock
        const checkSql = `SELECT cantidad_disponible FROM public.stock WHERE producto_id = :productoId`;
        const rows = await sequelize.query(checkSql, { replacements: { productoId: it.productId }, type: QueryTypes.SELECT, transaction: t });
        const remaining = rows && rows[0] ? Number(rows[0].cantidad_disponible || 0) : 0;
        if (remaining < 0) {
          throw new Error(`Stock inconsistente para producto ${it.productId}`);
        }
      }

      await t.commit();

      const resumen = {
        compraId,
        numeroOrden,
        pacienteId,
        items: items.map(it => ({ ...it, precio_unitario: catalogMap[it.productId]?.precio ?? 0 })),
        subtotal,
        descuento,
        total: totalFinal,
        moneda: 'COP',
        fecha: new Date().toISOString(),
        estado: 'PENDIENTE',
      };

      return resumen;
    } catch (txErr) {
      await t.rollback();
      throw txErr;
    }
  } catch (error) {
    logger.error('ProductosService.procesarCompra error: ' + error.message);
    throw error;
  }
};

export default { consultarCatalogo, procesarCompra };
