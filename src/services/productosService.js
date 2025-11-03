import productoRepository from '../repositories/productoRepository.js';
import proveedorAdapter from '../jobs/proveedorAdapter.js';
import PaymentService from './pagoService.js'; // ⚡ NUEVO: Integrar sistema de pagos
import db from '../models/index.js';
import logger from '../utils/logger.js';
import { sequelize } from '../database/database.js';
import { v4 as uuidv4 } from 'uuid';
import { QueryTypes } from 'sequelize';

/**
 * ProductosService - Ahora integrado con sistema de pagos
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

/**
 * Procesa una compra de productos
 * AHORA: Crea la compra + genera orden de pago automáticamente
 */
const procesarCompra = async (pacienteId, items = [], metodoPago = 'TARJETA') => {
  try {
    // 1) Verificar suscripción activa
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

    // 2) Verificar disponibilidad
    const ids = items.map(i => i.productId);
    const disponibilidadMap = await proveedorAdapter.consultarDisponibilidad(ids);

    const unavailable = [];
    let total = 0;

    // Obtener detalles de productos para calcular precio
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

    // 3) Persistir compra y items dentro de una transacción
    const t = await sequelize.transaction();
    try {
      const compraId = uuidv4();
      const numeroOrden = `ORD-${Date.now().toString(36)}-${uuidv4().slice(0, 6)}`;

      const subtotal = total;
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
          estado: 'CARRITO', // ⚡ CAMBIO: Empieza en CARRITO, cambiará a PENDIENTE cuando pague
          tipoEntrega: 'DOMICILIO',
        },
        transaction: t,
      });

      // Insertar items
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

        // ⚡ NUEVO: Ya no decrementamos stock aquí, se hará cuando el pago sea confirmado
        // Esto evita reservar stock de pagos que nunca se completan
      }

      await t.commit();

      logger.info(`✅ Compra ${compraId} creada exitosamente. Total: $${totalFinal}`);

      // 4) ⚡ NUEVO: Crear orden de pago automáticamente
      const resultadoPago = await PaymentService.crearOrdenPago({
        metodoPago: metodoPago,
        tipoOrden: 'COMPRA',
        pacienteId: pacienteId,
        compraId: compraId,
        monto: totalFinal,
        currency: 'cop',
        metadata: {
          numero_orden: numeroOrden,
          cantidad_items: items.length,
          tipo: 'compra_productos'
        }
      });

      logger.info(`✅ Orden de pago creada: ${resultadoPago.orden.id} | Método: ${metodoPago}`);

      // 5) Preparar respuesta completa
      const resumen = {
        compra: {
          id: compraId,
          numero_orden: numeroOrden,
          paciente_id: pacienteId,
          items: items.map(it => ({
            producto_id: it.productId,
            cantidad: it.cantidad,
            precio_unitario: catalogMap[it.productId]?.precio ?? 0,
            nombre: catalogMap[it.productId]?.nombre ?? 'Producto'
          })),
          subtotal,
          descuento,
          total: totalFinal,
          moneda: 'COP',
          fecha: new Date().toISOString(),
          estado: 'CARRITO', // Esperando pago
        },
        ordenPago: {
          id: resultadoPago.orden.id,
          estado: resultadoPago.orden.estado,
          monto: resultadoPago.orden.monto,
          metodo_pago: resultadoPago.orden.metodo_pago,
          referencia: resultadoPago.orden.referencia_transaccion
        }
      };

      // Agregar datos específicos según método de pago
      if (metodoPago === 'TARJETA' && resultadoPago.paymentIntent) {
        resumen.stripe = {
          clientSecret: resultadoPago.paymentIntent.client_secret,
          paymentIntentId: resultadoPago.paymentIntent.id
        };
      }

      if (metodoPago === 'PASARELA') {
        resumen.pse = {
          referencia: resultadoPago.orden.referencia_transaccion,
          mensaje: resultadoPago.message
        };
      }

      if (metodoPago === 'CONSIGNACION' && resultadoPago.instrucciones) {
        resumen.consignacion = resultadoPago.instrucciones;
      }

      return resumen;

    } catch (txErr) {
      await t.rollback();
      throw txErr;
    }

  } catch (error) {
    logger.error('❌ ProductosService.procesarCompra error: ' + error.message);
    throw error;
  }
};

/**
 * ⚡ NUEVO: Confirma una compra después de que el pago sea exitoso
 * Este método se llamará desde el webhook o confirmación de pago
 */
const confirmarCompra = async (compraId) => {
  try {
    const t = await sequelize.transaction();

    try {
      // 1. Actualizar estado de compra a PENDIENTE (esperando preparación)
      const updateCompraSql = `
        UPDATE public.compra 
        SET estado = 'PENDIENTE', fecha_pago = now(), fecha_actualizacion = now()
        WHERE id = :compraId
      `;
      await sequelize.query(updateCompraSql, {
        replacements: { compraId },
        transaction: t,
      });

      // 2. Decrementar stock de los productos
      const getItemsSql = `
        SELECT producto_id, cantidad 
        FROM public.compra_producto 
        WHERE compra_id = :compraId
      `;
      const items = await sequelize.query(getItemsSql, {
        replacements: { compraId },
        type: QueryTypes.SELECT,
        transaction: t,
      });

      for (const item of items) {
        const updateStockSql = `
          UPDATE public.stock
          SET cantidad_disponible = cantidad_disponible - :cantidad
          WHERE producto_id = :productoId AND cantidad_disponible >= :cantidad
        `;
        await sequelize.query(updateStockSql, {
          replacements: { 
            productoId: item.producto_id, 
            cantidad: item.cantidad 
          },
          transaction: t,
        });

        // Verificar stock restante
        const checkSql = `SELECT cantidad_disponible FROM public.stock WHERE producto_id = :productoId`;
        const rows = await sequelize.query(checkSql, { 
          replacements: { productoId: item.producto_id }, 
          type: QueryTypes.SELECT, 
          transaction: t 
        });
        
        const remaining = rows && rows[0] ? Number(rows[0].cantidad_disponible || 0) : 0;
        if (remaining < 0) {
          throw new Error(`Stock inconsistente para producto ${item.producto_id}`);
        }
      }

      await t.commit();
      logger.info(`✅ Compra ${compraId} confirmada y stock actualizado`);
      
      return { success: true, compraId };

    } catch (txErr) {
      await t.rollback();
      throw txErr;
    }

  } catch (error) {
    logger.error(`❌ Error confirmando compra: ${error.message}`);
    throw error;
  }
};

export default { 
  consultarCatalogo, 
  procesarCompra,
  confirmarCompra 
};