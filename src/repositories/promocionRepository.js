import db from '../models/index.js';
import logger from '../utils/logger.js';

class PromocionRepository {
  async obtenerPorCodigo(codigo) {
    try {
      return await db.Promocion.findOne({ where: { codigo } });
    } catch (err) {
      logger.error('Error obteniendo promoción por código:', err.message);
      throw err;
    }
  }

  async validarYAplicarDescuento(codigoPromocion, pacienteId, montoOriginal) {
    try {
      const promocion = await this.obtenerPorCodigo(codigoPromocion);

      if (!promocion) {
        return { valida: false, error: 'Código de promoción no encontrado' };
      }

      if (!promocion.activo) {
        return { valida: false, error: 'Promoción inactiva' };
      }

      const ahora = new Date().toISOString().split('T')[0];
      if (ahora < promocion.fecha_inicio || ahora > promocion.fecha_fin) {
        return { valida: false, error: 'Promoción fuera de vigencia' };
      }

      // Verificar usos máximos por usuario
      if (promocion.uso_maximo_por_usuario) {
        const usos = await db.PromocionPaciente.count({
          where: { promocion_id: promocion.id, paciente_id: pacienteId },
        });

        if (usos >= promocion.uso_maximo_por_usuario) {
          return { valida: false, error: 'Ha alcanzado el límite de usos para esta promoción' };
        }
      }

      // Aplicar descuento (siempre porcentaje)
      const descuentoAplicado = (montoOriginal * promocion.valor_descuento) / 100;
      const montoFinal = montoOriginal - descuentoAplicado;

      return {
        valida: true,
        promocion,
        descuentoAplicado: Number(descuentoAplicado.toFixed(2)),
        montoFinal: Number(montoFinal.toFixed(2)),
      };
    } catch (err) {
      logger.error('Error validando promoción:', err.message);
      throw err;
    }
  }

  async incrementarUso(promocionId, pacienteId) {
    try {
      await db.PromocionPaciente.create({
        promocion_id: promocionId,
        paciente_id: pacienteId,
        fecha_asignacion: new Date(),
      });
      return { success: true };
    } catch (err) {
      logger.error('Error incrementando uso de promoción:', err.message);
      throw err;
    }
  }

  async crearPromocion({ codigo, nombre, descripcion, tipoPromocion, valor, productoId, categoriaProducto, fechaInicio, fechaFin, usosMaximos }) {
    try {
      return await db.Promocion.create({
        codigo,
        nombre,
        descripcion,
        tipo_promocion: tipoPromocion,
        tipo_descuento: 'PORCENTAJE',
        valor_descuento: valor,
        producto_id: productoId || null,
        categoria_producto: categoriaProducto || null,
        uso_maximo_por_usuario: usosMaximos || 1,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        activo: true,
      });
    } catch (err) {
      logger.error('Error creando promoción:', err.message);
      throw err;
    }
  }
}

export default new PromocionRepository();
