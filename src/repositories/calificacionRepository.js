import { 
  CalificacionMedico, 
  CalificacionProducto, 
  Medico, 
  ProductoFarmaceutico, 
  Paciente, 
  Cita, 
  Compra,
  CompraProducto,
  sequelize 
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
          attributes: ['id', 'nombres', 'apellidos', 'especialidad', 'calificacion_promedio'] 
        },
        { 
          model: Cita, 
          as: 'cita',
          attributes: ['id', 'fecha_hora', 'modalidad', 'estado']
        }
      ]
    });
  }

  async obtenerCalificacionesPorMedico(medicoId, filtros = {}) {
    const where = { medico_id: medicoId };
    
    if (filtros.puntuacionMin) {
      where.puntuacion = { [Op.gte]: filtros.puntuacionMin };
    }
    
    if (filtros.puntuacionMax) {
      where.puntuacion = { ...where.puntuacion, [Op.lte]: filtros.puntuacionMax };
    }
    
    if (filtros.fechaDesde) {
      where.fecha_creacion = { [Op.gte]: new Date(filtros.fechaDesde) };
    }

    if (filtros.fechaHasta) {
      where.fecha_creacion = { 
        ...where.fecha_creacion, 
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
          attributes: ['fecha_hora', 'modalidad']
        }
      ],
      order: [['fecha_creacion', 'DESC']],
      limit: filtros.limit || 50,
      offset: filtros.offset || 0
    });
  }

  async verificarCalificacionMedicoPorCita(citaId) {
    return await CalificacionMedico.findOne({ 
      where: { cita_id: citaId } 
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
      fechaHora: cita.fecha_hora
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
      where: { medico_id: medicoId },
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
      where: { medico_id: medicoId },
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
        calificacion_promedio: stats.promedio
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
          attributes: ['id', 'nombre', 'marca', 'calificacion_promedio'] 
        },
        { 
          model: Compra, 
          as: 'compra',
          attributes: ['id', 'numero_orden', 'estado', 'fecha_entrega']
        }
      ]
    });
  }

  async obtenerCalificacionesPorProducto(productoId, filtros = {}) {
    const where = { producto_id: productoId }; // ✅ CORREGIDO
    
    if (filtros.puntuacionMin) {
      where.puntuacion = { [Op.gte]: filtros.puntuacionMin };
    }
    
    if (filtros.puntuacionMax) {
      where.puntuacion = { ...where.puntuacion, [Op.lte]: filtros.puntuacionMax };
    }
    
    if (filtros.fechaDesde) {
      where.fecha_creacion = { [Op.gte]: new Date(filtros.fechaDesde) };
    }

    if (filtros.fechaHasta) {
      where.fecha_creacion = { 
        ...where.fecha_creacion, 
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
          attributes: ['numero_orden', 'fecha_entrega']
        }
      ],
      order: [['fecha_creacion', 'DESC']],
      limit: filtros.limit || 50,
      offset: filtros.offset || 0
    });
  }

  async verificarCalificacionProductoPorCompra(compraId, productoId) {
    return await CalificacionProducto.findOne({ 
      where: { 
        compra_id: compraId,      // ✅ CORREGIDO
        producto_id: productoId   // ✅ CORREGIDO
      } 
    });
  }

  async verificarProductoEnCompra(compraId, productoId) {
    const compraProducto = await CompraProducto.findOne({
      where: {
        compra_id: compraId,
        producto_id: productoId
      }
    });
    
    return compraProducto !== null;
  }

  async verificarCompraEntregada(compraId) {
    const compra = await Compra.findByPk(compraId, {
      attributes: ['id', 'estado', 'fecha_entrega']
    });
    
    if (!compra) return null;
    
    return {
      existe: true,
      entregada: compra.estado === 'ENTREGADA',  // ✅ CORREGIDO
      estado: compra.estado,
      fechaEntrega: compra.fecha_entrega
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
      where: { producto_id: productoId }, // ✅ CORREGIDO
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
      where: { producto_id: productoId }, // ✅ CORREGIDO
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
        calificacion_promedio: stats.promedio,
        cantidad_calificaciones: stats.total
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
        where: { paciente_id: pacienteId }, 
        include: [
          { model: Medico, as: 'medico', attributes: ['id', 'nombres', 'apellidos'] },
          { model: Cita, as: 'cita', attributes: ['fecha_hora', 'modalidad'] }
        ],
        order: [['fecha_creacion', 'DESC']]
      });
    }
    
    if (tipo === 'productos' || tipo === 'ambos') {
      result.productos = await CalificacionProducto.findAll({
        where: { paciente_id: pacienteId }, 
        include: [
          { model: ProductoFarmaceutico, as: 'producto', attributes: ['id', 'nombre', 'marca'] },
          { model: Compra, as: 'compra', attributes: ['numero_orden', 'fecha_entrega'] }
        ],
        order: [['fecha_creacion', 'DESC']]
      });
    }
    
    return result;
  }
}

export default new CalificacionRepository();