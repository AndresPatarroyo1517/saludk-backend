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
import { CalculadoraReputacion } from '../infra/strategies/calificacionStrategy.js';
import { EstrategiaFactory } from '../infra/strategies/calificacionStrategy.js';

class CalificacionRepository {
  constructor() {
    // Por defecto usa estrategia simple
    // Puedes cambiarla dinámicamente según necesites
    this.calculadora = new CalculadoraReputacion(
      EstrategiaFactory.crear('simple')
    );
  }

  /**
   * Cambiar la estrategia de cálculo en runtime
   * @param {string} tipo - 'simple' | 'ponderado' | 'suavizado' | 'bayesian'
   * @param {Object} opciones - Opciones específicas de la estrategia
   */
  configurarEstrategia(tipo, opciones = {}) {
    const estrategia = EstrategiaFactory.crear(tipo, opciones);
    this.calculadora.setStrategy(estrategia);
    console.log(`Estrategia cambiada a: ${this.calculadora.obtenerNombreEstrategia()}`);
  }

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

  /**
   * 🔥 MÉTODO REFACTORIZADO CON STRATEGY
   * Calcula estadísticas usando la estrategia configurada
   */
  async calcularEstadisticasMedico(medicoId) {
    // Obtener TODAS las calificaciones con sus fechas
    const calificaciones = await CalificacionMedico.findAll({
      where: { medico_id: medicoId },
      attributes: ['id', 'puntuacion', 'fecha_creacion'],
      raw: true
    });

    if (calificaciones.length === 0) {
      return {
        promedio: 0,
        total: 0,
        minimo: 0,
        maximo: 0,
        distribucion: [],
        estrategia: this.calculadora.obtenerNombreEstrategia()
      };
    }

    // 🎯 USAR STRATEGY PATTERN AQUÍ
    const promedio = this.calculadora.calcularPromedio(calificaciones);

    // Estadísticas básicas (sin strategy, son fijas)
    const puntuaciones = calificaciones.map(c => c.puntuacion);
    const minimo = Math.min(...puntuaciones);
    const maximo = Math.max(...puntuaciones);

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
      promedio: parseFloat(promedio),
      total: calificaciones.length,
      minimo,
      maximo,
      distribucion,
      estrategia: this.calculadora.obtenerNombreEstrategia()
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
    const where = { producto_id: productoId };
    
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
        compra_id: compraId,
        producto_id: productoId
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
      entregada: compra.estado === 'ENTREGADA',
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

  /**
   * 🔥 MÉTODO REFACTORIZADO CON STRATEGY
   */
  async calcularEstadisticasProducto(productoId) {
    const calificaciones = await CalificacionProducto.findAll({
      where: { producto_id: productoId },
      attributes: ['id', 'puntuacion', 'fecha_creacion'],
      raw: true
    });

    if (calificaciones.length === 0) {
      return {
        promedio: 0,
        total: 0,
        minimo: 0,
        maximo: 0,
        distribucion: [],
        estrategia: this.calculadora.obtenerNombreEstrategia()
      };
    }

    // 🎯 USAR STRATEGY PATTERN
    const promedio = this.calculadora.calcularPromedio(calificaciones);

    const puntuaciones = calificaciones.map(c => c.puntuacion);
    const minimo = Math.min(...puntuaciones);
    const maximo = Math.max(...puntuaciones);

    const distribucion = await CalificacionProducto.findAll({
      where: { producto_id: productoId },
      attributes: [
        'puntuacion',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['puntuacion'],
      raw: true,
      order: [['puntuacion', 'DESC']]
    });
    
    return {
      promedio: parseFloat(promedio),
      total: calificaciones.length,
      minimo,
      maximo,
      distribucion,
      estrategia: this.calculadora.obtenerNombreEstrategia()
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