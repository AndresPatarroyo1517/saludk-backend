import { 
  CalificacionMedico, 
  CalificacionProducto, 
  Medico, 
  ProductoFarmaceutico, 
  Paciente, 
  Cita, 
  Compra,
  CompraProducto 
} from '../models/index.js';
import { Op } from 'sequelize';

class CalificacionRepository {
  // ==================== CALIFICACIONES DE MÉDICOS ====================
  
  async crearCalificacionMedico(data) {
    return await CalificacionMedico.create(data);
  }

  async obtenerCalificacionMedicoPorId(id) {
    return await CalificacionMedico.findByPk(id, {
      include: [
        { 
          model: Paciente, 
          as: 'paciente', 
          attributes: ['id', 'nombres', 'apellidos'] 
        },
        { 
          model: Medico, 
          as: 'medico', 
          attributes: ['id', 'nombres', 'apellidos', 'especialidad', 'calificacionPromedio'] 
        },
        { 
          model: Cita, 
          as: 'cita',
          attributes: ['id', 'fechaHora', 'modalidad', 'estado']
        }
      ]
    });
  }

  async obtenerCalificacionesPorMedico(medicoId, filtros = {}) {
    const where = { medicoId };
    
    if (filtros.puntuacionMin) {
      where.puntuacion = { [Op.gte]: filtros.puntuacionMin };
    }
    
    if (filtros.puntuacionMax) {
      where.puntuacion = { ...where.puntuacion, [Op.lte]: filtros.puntuacionMax };
    }
    
    if (filtros.fechaDesde) {
      where.fechaCreacion = { [Op.gte]: new Date(filtros.fechaDesde) };
    }

    if (filtros.fechaHasta) {
      where.fechaCreacion = { 
        ...where.fechaCreacion, 
        [Op.lte]: new Date(filtros.fechaHasta) 
      };
    }

    return await CalificacionMedico.findAndCountAll({
      where,
      include: [
        { 
          model: Paciente, 
          as: 'paciente', 
          attributes: ['id', 'nombres', 'apellidos'] 
        },
        {
          model: Cita,
          as: 'cita',
          attributes: ['fechaHora', 'modalidad']
        }
      ],
      order: [['fechaCreacion', 'DESC']],
      limit: filtros.limit || 50,
      offset: filtros.offset || 0
    });
  }

  async verificarCalificacionMedicoPorCita(citaId) {
    return await CalificacionMedico.findOne({ 
      where: { citaId } 
    });
  }

  async verificarCitaCompletada(citaId) {
    const cita = await Cita.findByPk(citaId, {
      attributes: ['id', 'estado', 'fecha_hora']
    });
    
    if (!cita) return null;
    
    return {
      existe: true,
      completada: cita.estado === 'COMPLETADA',
      estado: cita.estado,
    };
  }

  async actualizarCalificacionMedico(id, data) {
    const calificacion = await CalificacionMedico.findByPk(id);
    if (!calificacion) return null;
    return await calificacion.update(data);
  }

  async eliminarCalificacionMedico(id) {
    const calificacion = await CalificacionMedico.findByPk(id);
    if (!calificacion) return false;
    await calificacion.destroy();
    return true;
  }

  async calcularEstadisticasMedico(medicoId) {
    const [stats] = await CalificacionMedico.findAll({
      where: { medicoId },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('puntuacion')), 'promedio'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('MIN', sequelize.col('puntuacion')), 'minimo'],
        [sequelize.fn('MAX', sequelize.col('puntuacion')), 'maximo']
      ],
      raw: true
    });
    
    // Distribución por puntuación
    const distribucion = await CalificacionMedico.findAll({
      where: { medicoId },
      attributes: [
        'puntuacion',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['puntuacion'],
      raw: true,
      order: [['puntuacion', 'DESC']]
    });
    
    return {
      promedio: parseFloat(stats?.promedio || 0).toFixed(2),
      total: parseInt(stats?.total || 0),
      minimo: parseInt(stats?.minimo || 0),
      maximo: parseInt(stats?.maximo || 0),
      distribucion
    };
  }

  async actualizarPromedioMedico(medicoId) {
    const stats = await this.calcularEstadisticasMedico(medicoId);
    
    await Medico.update(
      { 
        calificacionPromedio: stats.promedio
      },
      { where: { id: medicoId } }
    );
    
    return stats;
  }

  // ==================== CALIFICACIONES DE PRODUCTOS ====================

  async crearCalificacionProducto(data) {
    return await CalificacionProducto.create(data);
  }

  async obtenerCalificacionProductoPorId(id) {
    return await CalificacionProducto.findByPk(id, {
      include: [
        { 
          model: Paciente, 
          as: 'paciente', 
          attributes: ['id', 'nombres', 'apellidos'] 
        },
        { 
          model: ProductoFarmaceutico, 
          as: 'producto', 
          attributes: ['id', 'nombre', 'marca', 'calificacionPromedio'] 
        },
        { 
          model: Compra, 
          as: 'compra',
          attributes: ['id', 'numeroOrden', 'estado', 'fechaEntrega']
        }
      ]
    });
  }

  async obtenerCalificacionesPorProducto(productoId, filtros = {}) {
    const where = { productoId };
    
    if (filtros.puntuacionMin) {
      where.puntuacion = { [Op.gte]: filtros.puntuacionMin };
    }
    
    if (filtros.puntuacionMax) {
      where.puntuacion = { ...where.puntuacion, [Op.lte]: filtros.puntuacionMax };
    }
    
    if (filtros.fechaDesde) {
      where.fechaCreacion = { [Op.gte]: new Date(filtros.fechaDesde) };
    }

    if (filtros.fechaHasta) {
      where.fechaCreacion = { 
        ...where.fechaCreacion, 
        [Op.lte]: new Date(filtros.fechaHasta) 
      };
    }

    return await CalificacionProducto.findAndCountAll({
      where,
      include: [
        { 
          model: Paciente, 
          as: 'paciente', 
          attributes: ['id', 'nombres', 'apellidos'] 
        },
        {
          model: Compra,
          as: 'compra',
          attributes: ['numeroOrden', 'fechaEntrega']
        }
      ],
      order: [['fechaCreacion', 'DESC']],
      limit: filtros.limit || 50,
      offset: filtros.offset || 0
    });
  }

  async verificarCalificacionProductoPorCompra(compraId, productoId) {
    return await CalificacionProducto.findOne({ 
      where: { 
        compraId,
        productoId 
      } 
    });
  }

  async verificarProductoEnCompra(compraId, productoId) {
    const compraProducto = await CompraProducto.findOne({
      where: {
        compraId,
        productoId
      }
    });
    
    return compraProducto !== null;
  }

  async verificarCompraEntregada(compraId) {
    const compra = await Compra.findByPk(compraId, {
      attributes: ['id', 'estado', 'fechaEntrega']
    });
    
    if (!compra) return null;
    
    return {
      existe: true,
      entregada: compra.estado === 'ENTREGADO',
      estado: compra.estado,
      fechaEntrega: compra.fechaEntrega
    };
  }

  async actualizarCalificacionProducto(id, data) {
    const calificacion = await CalificacionProducto.findByPk(id);
    if (!calificacion) return null;
    return await calificacion.update(data);
  }

  async eliminarCalificacionProducto(id) {
    const calificacion = await CalificacionProducto.findByPk(id);
    if (!calificacion) return false;
    await calificacion.destroy();
    return true;
  }

  async calcularEstadisticasProducto(productoId) {
    const [stats] = await CalificacionProducto.findAll({
      where: { productoId },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('puntuacion')), 'promedio'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('MIN', sequelize.col('puntuacion')), 'minimo'],
        [sequelize.fn('MAX', sequelize.col('puntuacion')), 'maximo']
      ],
      raw: true
    });
    
    // Distribución por puntuación
    const distribucion = await CalificacionProducto.findAll({
      where: { productoId },
      attributes: [
        'puntuacion',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['puntuacion'],
      raw: true,
      order: [['puntuacion', 'DESC']]
    });
    
    return {
      promedio: parseFloat(stats?.promedio || 0).toFixed(2),
      total: parseInt(stats?.total || 0),
      minimo: parseInt(stats?.minimo || 0),
      maximo: parseInt(stats?.maximo || 0),
      distribucion
    };
  }

  async actualizarPromedioProducto(productoId) {
    const stats = await this.calcularEstadisticasProducto(productoId);
    
    await ProductoFarmaceutico.update(
      { 
        calificacionPromedio: stats.promedio,
        cantidadCalificaciones: stats.total
      },
      { where: { id: productoId } }
    );
    
    return stats;
  }

  // ==================== MÉTODOS GENERALES ====================

  async obtenerCalificacionesPorPaciente(pacienteId, tipo = 'ambos') {
    const result = {};
    
    if (tipo === 'medicos' || tipo === 'ambos') {
      result.medicos = await CalificacionMedico.findAll({
        where: { pacienteId },
        include: [
          { model: Medico, as: 'medico', attributes: ['id', 'nombres', 'apellidos'] },
          { model: Cita, as: 'cita', attributes: ['fechaHora', 'modalidad'] }
        ],
        order: [['fechaCreacion', 'DESC']]
      });
    }
    
    if (tipo === 'productos' || tipo === 'ambos') {
      result.productos = await CalificacionProducto.findAll({
        where: { pacienteId },
        include: [
          { model: ProductoFarmaceutico, as: 'producto', attributes: ['id', 'nombre', 'marca'] },
          { model: Compra, as: 'compra', attributes: ['numeroOrden', 'fechaEntrega'] }
        ],
        order: [['fechaCreacion', 'DESC']]
      });
    }
    
    return result;
  }
}

export default new CalificacionRepository();