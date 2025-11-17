import productoRepository from '../repositories/productoRepository.js';
import proveedorAdapter from '../jobs/proveedorAdapter.js';
import PaymentService from './pagoService.js';
import db from '../models/index.js';
import logger from '../utils/logger.js';
import { sequelize } from '../database/database.js';
import { v4 as uuidv4 } from 'uuid';
import { QueryTypes } from 'sequelize';
import notificationService from './notificationService.js';

/**
 * Estados válidos de una compra
 */
const ESTADOS_COMPRA = {
  CARRITO: 'CARRITO',
  PENDIENTE: 'PENDIENTE', // Pago confirmado, esperando preparación
  PAGADA: 'PAGADA', // Sinónimo de PENDIENTE (opcional)
  PREPARANDO: 'PREPARANDO',
  EN_TRANSITO: 'EN_TRANSITO',
  ENTREGADA: 'ENTREGADA',
  CANCELADA: 'CANCELADA'
};

/**
 * Transiciones de estado válidas
 */
const TRANSICIONES_VALIDAS = {
  CARRITO: ['PENDIENTE', 'CANCELADA'],
  PENDIENTE: ['PREPARANDO', 'CANCELADA'],
  PAGADA: ['PREPARANDO', 'CANCELADA'],
  PREPARANDO: ['EN_TRANSITO', 'CANCELADA'],
  EN_TRANSITO: ['ENTREGADA', 'CANCELADA'],
  ENTREGADA: [],
  CANCELADA: []
};

const consultarCatalogo = async (options = {}) => {
  const { search, category, page, limit } = options;
  const products = await productoRepository.findAll({ search, category, page, limit });

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
 * Crea la compra + genera orden de pago automáticamente
 */
const procesarCompra = async (pacienteId, items = [], metodoPago = 'TARJETA_CREDITO', direccion_entrega_id) => {
  try {
    // 1) Verificar suscripción activa
    const today = new Date().toISOString().slice(0,10);
    const suscripcion = await db.Suscripcion.findOne({
      where: { paciente_id: pacienteId }
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

    const catalog = await productoRepository.findAll({});
    const catalogMap = Object.fromEntries(catalog.map(p => [p.id, p]));

    for (const it of items) {
      const stock = disponibilidadMap[it.productId] ?? (catalogMap[it.productId]?.cantidad_disponible ?? 0);
      if (stock < (it.cantidad || 1)) {
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

    // 3) Persistir compra y items
    const t = await sequelize.transaction();
    try {
      const compraId = uuidv4();
      const numeroOrden = `ORD-${Date.now().toString(36)}-${uuidv4().slice(0, 6)}`;

      const subtotal = total;
      const descuento = 0.0;
      const totalFinal = subtotal - descuento;

      const insertCompraSql = `
        INSERT INTO public.compra (
          id, paciente_id, numero_orden, subtotal, descuento, total, 
          estado, tipo_entrega, direccion_entrega_id, fecha_creacion
        )
        VALUES (
          :id, :pacienteId, :numeroOrden, :subtotal, :descuento, :total, 
          :estado, :tipoEntrega, :direccionEntregaId, now()
        )
      `;

      await sequelize.query(insertCompraSql, {
        replacements: {
          id: compraId,
          pacienteId,
          numeroOrden,
          subtotal,
          descuento,
          total: totalFinal,
          estado: 'CARRITO',
          tipoEntrega: 'DOMICILIO',
          direccionEntregaId: direccion_entrega_id
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
          INSERT INTO public.compra_producto (
            id, compra_id, producto_id, cantidad, precio_unitario, 
            descuento_aplicado, subtotal
          )
          VALUES (
            :id, :compraId, :productoId, :cantidad, :precioUnitario, 
            :descuentoAplicado, :subtotal
          )
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
      }

      await t.commit();
      logger.info(`✅ Compra ${compraId} creada exitosamente. Total: $${totalFinal}`);

      // 4) Crear orden de pago automáticamente
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

      // 5) Preparar respuesta
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
          estado: 'CARRITO',
        },
        ordenPago: {
          id: resultadoPago.orden.id,
          estado: resultadoPago.orden.estado,
          monto: resultadoPago.orden.monto,
          metodo_pago: resultadoPago.orden.metodo_pago,
          referencia: resultadoPago.orden.referencia_transaccion
        }
      };

      if (metodoPago === 'TARJETA_CREDITO' && resultadoPago.paymentIntent) {
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
 * Confirma una compra después de que el pago sea exitoso
 * Cambia estado de CARRITO a PENDIENTE y decrementa stock
 */
const confirmarCompra = async (compraId) => {
  try {
    const t = await sequelize.transaction();

    try {
      // 1. Verificar que la compra existe y está en estado CARRITO
      const verificarCompraSql = `
        SELECT id, estado, paciente_id 
        FROM public.compra 
        WHERE id = :compraId
      `;
      const [compras] = await sequelize.query(verificarCompraSql, {
        replacements: { compraId },
        type: QueryTypes.SELECT,
        transaction: t,
      });

      if (!compras) {
        throw new Error(`Compra ${compraId} no encontrada`);
      }

      if (compras.estado !== 'CARRITO') {
        throw new Error(
          `La compra ${compraId} ya fue procesada. Estado actual: ${compras.estado}`
        );
      }

      // 2. Obtener items de la compra
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

      if (!items || items.length === 0) {
        throw new Error(`No hay productos en la compra ${compraId}`);
      }

      // 3. Decrementar stock con validación CORRECTA
      for (const item of items) {
        // Primero verificar stock disponible
        const checkStockSql = `
          SELECT cantidad_disponible 
          FROM public.stock 
          WHERE producto_id = :productoId
        `;
        const [stockActual] = await sequelize.query(checkStockSql, {
          replacements: { productoId: item.producto_id },
          type: QueryTypes.SELECT,
          transaction: t,
        });

        if (!stockActual) {
          throw new Error(
            `No existe registro de stock para producto ${item.producto_id}`
          );
        }

        const stockDisponible = Number(stockActual.cantidad_disponible || 0);
        const cantidadRequerida = Number(item.cantidad);

        if (stockDisponible < cantidadRequerida) {
          throw new Error(
            `Stock insuficiente para producto ${item.producto_id}. ` +
            `Disponible: ${stockDisponible}, Requerido: ${cantidadRequerida}`
          );
        }

        // Ahora sí decrementar
        const updateStockSql = `
          UPDATE public.stock
          SET cantidad_disponible = cantidad_disponible - :cantidad
          WHERE producto_id = :productoId
          RETURNING cantidad_disponible
        `;
        const [result] = await sequelize.query(updateStockSql, {
          replacements: { 
            productoId: item.producto_id, 
            cantidad: cantidadRequerida 
          },
          transaction: t,
        });

        // Verificación de seguridad post-actualización
        if (result && result[0]) {
          const nuevoStock = Number(result[0].cantidad_disponible);
          if (nuevoStock < 0) {
            throw new Error(
              `Stock inconsistente detectado para producto ${item.producto_id}. ` +
              `Stock resultante: ${nuevoStock}`
            );
          }
        }
      }

      // 4. Actualizar estado de compra a PENDIENTE
      const updateCompraSql = `
        UPDATE public.compra 
        SET estado = 'PENDIENTE', 
            fecha_pago = NOW(), 
            fecha_actualizacion = NOW()
        WHERE id = :compraId AND estado = 'CARRITO'
        RETURNING id, numero_orden
      `;
      const [compraResult] = await sequelize.query(updateCompraSql, {
        replacements: { compraId },
        transaction: t,
      });

      if (!compraResult || compraResult.length === 0) {
        throw new Error(
          `No se pudo actualizar la compra ${compraId}. ` +
          `Posible condición de carrera o compra ya procesada.`
        );
      }

      // 5. **CRÍTICO**: Actualizar orden_pago a COMPLETADA
      const updateOrdenPagoSql = `
        UPDATE public.orden_pago
        SET estado = 'COMPLETADA', 
            fecha_pago = NOW(),
            fecha_actualizacion = NOW()
        WHERE compra_id = :compraId 
          AND tipo_orden = 'COMPRA'
          AND estado IN ('PENDIENTE', 'PROCESANDO')
        RETURNING id, referencia_transaccion
      `;
      const [ordenResult] = await sequelize.query(updateOrdenPagoSql, {
        replacements: { compraId },
        transaction: t,
      });

      if (!ordenResult || ordenResult.length === 0) {
        throw new Error(
          `No se encontró orden de pago válida para la compra ${compraId}. ` +
          `Verifica que exista una orden_pago con tipo_orden='COMPRA' y estado='PENDIENTE'.`
        );
      }

      await t.commit();

      const numeroOrden = compraResult[0].numero_orden;
      const ordenPagoId = ordenResult[0].id;
      const referenciaTransaccion = ordenResult[0].referencia_transaccion;

      logger.info(
        `✅ Compra ${compraId} confirmada exitosamente. ` +
        `Orden: ${numeroOrden} | OrdenPago: ${ordenPagoId} | ` +
        `Productos: ${items.length} | Stock actualizado`
      );

      // 6. Enviar notificación (fuera de la transacción)
      await enviarNotificacionCambioEstado(compraId, 'PENDIENTE');
      
      return { 
        success: true, 
        compraId, 
        estado: 'PENDIENTE',
        numeroOrden,
        ordenPagoId,
        referenciaTransaccion,
        productosActualizados: items.length
      };

    } catch (txErr) {
      await t.rollback();
      logger.error(`❌ Rollback en confirmarCompra: ${txErr.message}`);
      throw txErr;
    }

  } catch (error) {
    logger.error(`❌ Error confirmando compra: ${error.message}`);
    throw error;
  }
};

/**
 * Cambia el estado de una compra
 */
const cambiarEstadoCompra = async (compraId, nuevoEstado, usuarioId = null) => {
  try {
    // Validar que el nuevo estado sea válido
    if (!Object.values(ESTADOS_COMPRA).includes(nuevoEstado)) {
      throw new Error(`Estado inválido: ${nuevoEstado}`);
    }

    // Obtener compra actual
    const compra = await db.Compra.findByPk(compraId);
    
    if (!compra) {
      const e = new Error('Compra no encontrada');
      e.status = 404;
      throw e;
    }

    const estadoActual = compra.estado;

    // Validar transición de estado
    if (!TRANSICIONES_VALIDAS[estadoActual]?.includes(nuevoEstado)) {
      throw new Error(
        `Transición de estado inválida: ${estadoActual} -> ${nuevoEstado}`
      );
    }

    // Actualizar estado
    const updateSql = `
      UPDATE public.compra 
      SET estado = :nuevoEstado, fecha_actualizacion = now()
      WHERE id = :compraId
    `;
    
    await sequelize.query(updateSql, {
      replacements: { compraId, nuevoEstado }
    });

    // Actualizar fecha_entrega si el estado es ENTREGADA
    if (nuevoEstado === 'ENTREGADA') {
      const updateFechaEntregaSql = `
        UPDATE public.compra 
        SET fecha_entrega = now()
        WHERE id = :compraId
      `;
      await sequelize.query(updateFechaEntregaSql, {
        replacements: { compraId }
      });
    }

    logger.info(`✅ Compra ${compraId}: ${estadoActual} -> ${nuevoEstado}`);

    // Enviar notificación
    await enviarNotificacionCambioEstado(compraId, nuevoEstado);

    // Registrar en auditoría si se proporciona usuarioId
    if (usuarioId) {
      await registrarAuditoria(usuarioId, 'CAMBIO_ESTADO_COMPRA', {
        compra_id: compraId,
        estado_anterior: estadoActual,
        estado_nuevo: nuevoEstado
      });
    }

    return { 
      success: true, 
      compraId, 
      estadoAnterior: estadoActual,
      estadoNuevo: nuevoEstado 
    };

  } catch (error) {
    logger.error(`❌ Error cambiando estado de compra: ${error.message}`);
    throw error;
  }
};

/**
 * Cancela una compra y restaura el stock si ya fue confirmada
 */
const cancelarCompra = async (compraId, motivo = null, usuarioId = null) => {
  try {
    const t = await sequelize.transaction();

    try {
      const compra = await db.Compra.findByPk(compraId, { transaction: t });
      
      if (!compra) {
        throw new Error('Compra no encontrada');
      }

      const estadoActual = compra.estado;

      // No permitir cancelar si ya está entregada
      if (estadoActual === 'ENTREGADA') {
        throw new Error('No se puede cancelar una compra ya entregada');
      }

      // Si la compra ya había sido confirmada, restaurar stock
      if (['PENDIENTE', 'PAGADA', 'PREPARANDO', 'EN_TRANSITO'].includes(estadoActual)) {
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
            SET cantidad_disponible = cantidad_disponible + :cantidad
            WHERE producto_id = :productoId
          `;
          await sequelize.query(updateStockSql, {
            replacements: { 
              productoId: item.producto_id, 
              cantidad: item.cantidad 
            },
            transaction: t,
          });
        }

        logger.info(`✅ Stock restaurado para compra ${compraId}`);
      }

      // Actualizar estado a CANCELADA
      const updateSql = `
        UPDATE public.compra 
        SET estado = 'CANCELADA', 
            notas_entrega = COALESCE(notas_entrega, '') || ' | Motivo cancelación: ' || :motivo,
            fecha_actualizacion = now()
        WHERE id = :compraId
      `;
      
      await sequelize.query(updateSql, {
        replacements: { 
          compraId, 
          motivo: motivo || 'No especificado' 
        },
        transaction: t
      });

      await t.commit();

      logger.info(`✅ Compra ${compraId} cancelada. Estado anterior: ${estadoActual}`);

      // Enviar notificación
      await enviarNotificacionCambioEstado(compraId, 'CANCELADA', motivo);

      // Registrar en auditoría
      if (usuarioId) {
        await registrarAuditoria(usuarioId, 'CANCELACION_COMPRA', {
          compra_id: compraId,
          estado_anterior: estadoActual,
          motivo
        });
      }

      return { 
        success: true, 
        compraId, 
        estadoAnterior: estadoActual,
        estadoNuevo: 'CANCELADA',
        stockRestaurado: ['PENDIENTE', 'PAGADA', 'PREPARANDO', 'EN_TRANSITO'].includes(estadoActual)
      };

    } catch (txErr) {
      await t.rollback();
      throw txErr;
    }

  } catch (error) {
    logger.error(`❌ Error cancelando compra: ${error.message}`);
    throw error;
  }
};

/**
 * Obtiene el detalle completo de una compra
 */
const obtenerDetalleCompra = async (compraId) => {
  try {
    const compra = await db.Compra.findByPk(compraId, {
      include: [
        {
          model: db.CompraProducto,
          as: 'productos',
          include: [{
            model: db.ProductoFarmaceutico,
            as: 'producto'
          }]
        },
        {
          model: db.Direccion,
          as: 'direccion_entrega'
        },
        {
          model: db.OrdenPago,
          as: 'pagos'
        }
      ]
    });

    if (!compra) {
      const e = new Error('Compra no encontrada');
      e.status = 404;
      throw e;
    }

    return compra;

  } catch (error) {
    logger.error(`❌ Error obteniendo detalle de compra: ${error.message}`);
    throw error;
  }
};

/**
 * Obtiene las compras de un paciente con filtros
 */
// ✅ Estados válidos según DDL
const ESTADOS_VALIDOS = ['CARRITO', 'PENDIENTE', 'PAGADA', 'PREPARANDO', 'EN_TRANSITO', 'ENTREGADA', 'CANCELADA'];

// ✅ Estados que SÍ son compras reales (excluye CARRITO)
const ESTADOS_HISTORIAL = ['PENDIENTE', 'PAGADA', 'PREPARANDO', 'EN_TRANSITO', 'ENTREGADA', 'CANCELADA'];

const obtenerComprasPorPaciente = async (pacienteId, options = {}) => {
  try {
    const { estado, limit = 20, offset = 0, incluirCarrito = false } = options;

    // ✅ Validar límites
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 100); // Máximo 100
    const offsetNum = Math.max(0, parseInt(offset));

    const where = { paciente_id: pacienteId };

    if (estado) {
      // ✅ Validar que el estado sea válido
      if (!ESTADOS_VALIDOS.includes(estado)) {
        throw { status: 400, message: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}` };
      }
      where.estado = estado;
    } else if (!incluirCarrito) {
      // ✅ Por defecto, excluir CARRITO del historial
      where.estado = { [db.Sequelize.Op.in]: ESTADOS_HISTORIAL };
    }

    // ✅ Contar total de registros para paginación correcta
    const total = await db.Compra.count({ where });

    const compras = await db.Compra.findAll({
      where,
      include: [
        {
          model: db.CompraProducto,
          as: 'productos',
          include: [{
            model: db.ProductoFarmaceutico,
            as: 'producto'
          }]
        }
      ],
      limit: limitNum,
      offset: offsetNum,
      order: [['fecha_creacion', 'DESC']]
    });

    return { compras, total };

  } catch (error) {
    logger.error(`❌ Error obteniendo compras del paciente: ${error.message}`);
    throw error;
  }
};

/**
 * Envía notificación al paciente sobre cambio de estado
 */
const enviarNotificacionCambioEstado = async (compraId, nuevoEstado, motivo = null) => {
  try {
    const compra = await db.Compra.findByPk(compraId, {
      include: [
        {
          model: db.Paciente,
          as: 'paciente',
          include: [{ model: db.Usuario, as: 'usuario' }]
        }
      ]
    });

    if (!compra || !compra.paciente?.usuario?.email) {
      logger.warn(`No se pudo enviar notificación para compra ${compraId}`);
      return;
    }

    const mensajes = {
      PENDIENTE: {
        asunto: '✅ Pago confirmado - Orden en proceso',
        mensaje: `Tu pago ha sido confirmado exitosamente. Orden: ${compra.numero_orden}`
      },
      PREPARANDO: {
        asunto: '📦 Tu pedido se está preparando',
        mensaje: `Estamos preparando tu pedido. Orden: ${compra.numero_orden}`
      },
      EN_TRANSITO: {
        asunto: '🚚 Tu pedido está en camino',
        mensaje: `Tu pedido ha sido enviado y está en tránsito. Orden: ${compra.numero_orden}`
      },
      ENTREGADA: {
        asunto: '🎉 Tu pedido ha sido entregado',
        mensaje: `Tu pedido ha sido entregado exitosamente. Orden: ${compra.numero_orden}`
      },
      CANCELADA: {
        asunto: '❌ Tu pedido ha sido cancelado',
        mensaje: `Tu pedido ha sido cancelado. Orden: ${compra.numero_orden}${motivo ? `. Motivo: ${motivo}` : ''}`
      }
    };

    const notif = mensajes[nuevoEstado];
    if (notif) {
      await notificationService.enviarEmail({
        destinatarios: [compra.paciente.usuario.email],
        asunto: notif.asunto,
        mensaje: notif.mensaje
      });

      logger.info(`📧 Notificación enviada a ${compra.paciente.usuario.email} - Estado: ${nuevoEstado}`);
    }

  } catch (error) {
    logger.warn(`Error enviando notificación: ${error.message}`);
  }
};

/**
 * Registra acción en auditoría
 */
const registrarAuditoria = async (usuarioId, accion, detalles) => {
  try {
    await db.Auditoria.create({
      usuario_id: usuarioId,
      accion,
      detalles,
      fecha: new Date()
    });
  } catch (error) {
    logger.warn(`Error registrando auditoría: ${error.message}`);
  }
};

export default { 
  consultarCatalogo, 
  procesarCompra,
  confirmarCompra,
  cambiarEstadoCompra,
  cancelarCompra,
  obtenerDetalleCompra,
  obtenerComprasPorPaciente
};