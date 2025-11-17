import {
  Compra,
  CompraProducto,
  ProductoFarmaceutico,
  Paciente,
  Direccion,
  Usuario,
  sequelize
} from '../models/index.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

class HistorialRepository {
  /**
   * Obtener una compra por su ID incluyendo productos y datos mínimos del paciente
   */
  async obtenerCompraPorId(compraId) {
    try {
      return await Compra.findByPk(compraId, {
        include: [
          { model: CompraProducto, as: 'productos', include: [{ model: ProductoFarmaceutico, as: 'producto' }] },
          { model: Paciente, as: 'paciente', attributes: ['id', 'nombres', 'apellidos'], include: [{ model: Usuario, as: 'usuario', attributes: ['email'] }] },
          { model: Direccion, as: 'direccion', attributes: ['id', 'direccion', 'ciudad'] }
        ]
      });
    } catch (error) {
      logger.error('HistorialRepository.obtenerCompraPorId error: ' + error.message);
      throw error;
    }
  }

  /**
   * Obtener historial de compras de un paciente con paginación y filtros
   * filtros: { page, limit, estado, desde, hasta, sort }
   */
  async obtenerHistorialPorPaciente(pacienteId, filtros = {}) {
    try {
      const page = Math.max(1, Number(filtros.page) || 1);
      const limit = Number(filtros.limit) || 20;
      const offset = (page - 1) * limit;

      const where = { paciente_id: pacienteId };

      if (filtros.estado) where.estado = filtros.estado;
      if (filtros.desde) where.fecha_creacion = { [Op.gte]: new Date(filtros.desde) };
      if (filtros.hasta) {
        where.fecha_creacion = {
          ...(where.fecha_creacion || {}),
          [Op.lte]: new Date(filtros.hasta)
        };
      }

      const order = [[filtros.sort || 'fecha_creacion', filtros.order || 'DESC']];

      return await Compra.findAndCountAll({
        where,
        include: [
          { model: CompraProducto, as: 'productos', include: [{ model: ProductoFarmaceutico, as: 'producto', attributes: ['id', 'nombre', 'precio'] }] },
          { model: Direccion, as: 'direccion', attributes: ['id', 'direccion', 'ciudad'] }
        ],
        order,
        limit,
        offset
      });
    } catch (error) {
      logger.error('HistorialRepository.obtenerHistorialPorPaciente error: ' + error.message);
      throw error;
    }
  }

  /**
   * Obtener compras recientes (por paciente)
   */
  async obtenerComprasRecientes(pacienteId, limit = 5) {
    try {
      return await Compra.findAll({
        where: { paciente_id: pacienteId },
        order: [['fecha_creacion', 'DESC']],
        limit,
        include: [
          { model: CompraProducto, as: 'productos', include: [{ model: ProductoFarmaceutico, as: 'producto', attributes: ['id', 'nombre'] }] }
        ]
      });
    } catch (error) {
      logger.error('HistorialRepository.obtenerComprasRecientes error: ' + error.message);
      throw error;
    }
  }

  /**
   * Actualizar el estado de una compra
   */
  async actualizarEstadoCompra(compraId, estado) {
    try {
      const compra = await Compra.findByPk(compraId);
      if (!compra) return null;
      return await compra.update({ estado });
    } catch (error) {
      logger.error('HistorialRepository.actualizarEstadoCompra error: ' + error.message);
      throw error;
    }
  }

  /**
   * Verificar si una compra existe y su estado 
   */
  async verificarCompra(compraId) {
    try {
      const compra = await Compra.findByPk(compraId, { attributes: ['id', 'estado', 'fecha_entrega', 'paciente_id'] });
      if (!compra) return null;
      return {
        existe: true,
        estado: compra.estado,
        entregada: compra.estado === 'ENTREGADA',
        pacienteId: compra.paciente_id,
        fechaEntrega: compra.fecha_entrega
      };
    } catch (error) {
      logger.error('HistorialRepository.verificarCompra error: ' + error.message);
      throw error;
    }
  }
}

export default new HistorialRepository();
