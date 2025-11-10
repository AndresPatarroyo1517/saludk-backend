import calificacionRepository from '../repositories/calificacionRepository.js';
import { sequelize } from '../database/database.js';

class CalificacionService {
  // ==================== CALIFICACIONES DE MÉDICOS ====================
  
  async crearCalificacionMedico(data) {
    const { pacienteId, medicoId, citaId, puntuacion, comentario } = data;

    // Validación: puntuación debe estar entre 1 y 5
    if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
      throw new Error('La puntuación debe estar entre 1 y 5');
    }

    // Validación: verificar que la cita existe y está completada
    const citaInfo = await calificacionRepository.verificarCitaCompletada(citaId);
    
    if (!citaInfo) {
      throw new Error('La cita no existe');
    }

    if (!citaInfo.completada) {
      throw new Error(`No se puede calificar una cita con estado: ${citaInfo.estado}. La cita debe estar COMPLETADA`);
    }

    // Validación: verificar que no exista ya una calificación para esta cita
    const calificacionExistente = await calificacionRepository.verificarCalificacionMedicoPorCita(citaId);
    
    if (calificacionExistente) {
      throw new Error('Ya existe una calificación para esta cita');
    }

    const transaction = await sequelize.transaction();
    
    try {
      // Crear la calificación con snake_case
      const calificacion = await calificacionRepository.crearCalificacionMedico({
        paciente_id: pacienteId,  // ✅ CORREGIDO
        medico_id: medicoId,      // ✅ CORREGIDO
        cita_id: citaId,          // ✅ CORREGIDO
        puntuacion,
        comentario: comentario || null
      });

      // Actualizar el promedio del médico
      await calificacionRepository.actualizarPromedioMedico(medicoId);

      await transaction.commit();
      
      // Retornar la calificación completa con relaciones
      return await calificacionRepository.obtenerCalificacionMedicoPorId(calificacion.id);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async obtenerCalificacionMedicoPorId(id) {
    const calificacion = await calificacionRepository.obtenerCalificacionMedicoPorId(id);
    
    if (!calificacion) {
      throw new Error('Calificación no encontrada');
    }
    
    return calificacion;
  }

  async obtenerCalificacionesPorMedico(medicoId, filtros = {}) {
    const resultado = await calificacionRepository.obtenerCalificacionesPorMedico(medicoId, filtros);
    
    return {
      calificaciones: resultado.rows,
      total: resultado.count,
      pagina: Math.floor((filtros.offset || 0) / (filtros.limit || 50)) + 1,
      totalPaginas: Math.ceil(resultado.count / (filtros.limit || 50))
    };
  }

  async obtenerEstadisticasMedico(medicoId) {
    return await calificacionRepository.calcularEstadisticasMedico(medicoId);
  }

  async actualizarCalificacionMedico(id, data, pacienteId) {
    const { puntuacion, comentario } = data;

    // Validación: verificar que la calificación existe
    const calificacionExistente = await calificacionRepository.obtenerCalificacionMedicoPorId(id);
    
    if (!calificacionExistente) {
      throw new Error('Calificación no encontrada');
    }

    // Validación: verificar que el paciente es el dueño de la calificación
    if (calificacionExistente.paciente_id !== pacienteId) { // ✅ CORREGIDO
      throw new Error('No tienes permiso para modificar esta calificación');
    }

    // Validación: puntuación debe estar entre 1 y 5
    if (puntuacion !== undefined && (puntuacion < 1 || puntuacion > 5)) {
      throw new Error('La puntuación debe estar entre 1 y 5');
    }

    const transaction = await sequelize.transaction();
    
    try {
      const datosActualizar = {};
      
      if (puntuacion !== undefined) datosActualizar.puntuacion = puntuacion;
      if (comentario !== undefined) datosActualizar.comentario = comentario;

      const calificacionActualizada = await calificacionRepository.actualizarCalificacionMedico(
        id, 
        datosActualizar
      );

      // Si se actualizó la puntuación, recalcular el promedio del médico
      if (puntuacion !== undefined) {
        await calificacionRepository.actualizarPromedioMedico(calificacionExistente.medico_id); // ✅ CORREGIDO
      }

      await transaction.commit();
      
      return await calificacionRepository.obtenerCalificacionMedicoPorId(id);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async eliminarCalificacionMedico(id, pacienteId) {
    const calificacionExistente = await calificacionRepository.obtenerCalificacionMedicoPorId(id);
    
    if (!calificacionExistente) {
      throw new Error('Calificación no encontrada');
    }

    // Validación: verificar que el paciente es el dueño de la calificación
    if (calificacionExistente.paciente_id !== pacienteId) { // ✅ CORREGIDO
      throw new Error('No tienes permiso para eliminar esta calificación');
    }

    const transaction = await sequelize.transaction();
    
    try {
      const medicoId = calificacionExistente.medico_id; // ✅ CORREGIDO
      
      await calificacionRepository.eliminarCalificacionMedico(id);
      
      // Recalcular el promedio del médico
      await calificacionRepository.actualizarPromedioMedico(medicoId);

      await transaction.commit();
      
      return { mensaje: 'Calificación eliminada exitosamente' };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ==================== CALIFICACIONES DE PRODUCTOS ====================

  async crearCalificacionProducto(data) {
    const { pacienteId, productoId, compraId, puntuacion, comentario } = data;

    // Validación: puntuación debe estar entre 1 y 5
    if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
      throw new Error('La puntuación debe estar entre 1 y 5');
    }

    // Validación: verificar que la compra existe y está entregada
    const compraInfo = await calificacionRepository.verificarCompraEntregada(compraId);
    
    if (!compraInfo) {
      throw new Error('La compra no existe');
    }
    if (!compraInfo.entregada) {
      throw new Error(`No se puede calificar una compra con estado: ${compraInfo.estado}. La compra debe estar ENTREGADA`);
    }

    // Validación: verificar que el producto está en la compra
    const productoEnCompra = await calificacionRepository.verificarProductoEnCompra(compraId, productoId);
    
    if (!productoEnCompra) {
      throw new Error('El producto no está incluido en esta compra');
    }

    // Validación: verificar que no exista ya una calificación para este producto en esta compra
    const calificacionExistente = await calificacionRepository.verificarCalificacionProductoPorCompra(
      compraId, 
      productoId
    );
    
    if (calificacionExistente) {
      throw new Error('Ya existe una calificación para este producto en esta compra');
    }

    const transaction = await sequelize.transaction();
    
    try {
      // Crear la calificación con snake_case
      const calificacion = await calificacionRepository.crearCalificacionProducto({
        paciente_id: pacienteId,  // ✅ CORREGIDO
        producto_id: productoId,  // ✅ CORREGIDO
        compra_id: compraId,      // ✅ CORREGIDO
        puntuacion,
        comentario: comentario || null
      });

      // Actualizar el promedio del producto
      await calificacionRepository.actualizarPromedioProducto(productoId);

      await transaction.commit();
      
      // Retornar la calificación completa con relaciones
      return await calificacionRepository.obtenerCalificacionProductoPorId(calificacion.id);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async obtenerCalificacionProductoPorId(id) {
    const calificacion = await calificacionRepository.obtenerCalificacionProductoPorId(id);
    
    if (!calificacion) {
      throw new Error('Calificación no encontrada');
    }
    
    return calificacion;
  }

  async obtenerCalificacionesPorProducto(productoId, filtros = {}) {
    const resultado = await calificacionRepository.obtenerCalificacionesPorProducto(productoId, filtros);
    
    return {
      calificaciones: resultado.rows,
      total: resultado.count,
      pagina: Math.floor((filtros.offset || 0) / (filtros.limit || 50)) + 1,
      totalPaginas: Math.ceil(resultado.count / (filtros.limit || 50))
    };
  }

  async obtenerEstadisticasProducto(productoId) {
    return await calificacionRepository.calcularEstadisticasProducto(productoId);
  }

  async actualizarCalificacionProducto(id, data, pacienteId) {
    const { puntuacion, comentario } = data;

    // Validación: verificar que la calificación existe
    const calificacionExistente = await calificacionRepository.obtenerCalificacionProductoPorId(id);
    
    if (!calificacionExistente) {
      throw new Error('Calificación no encontrada');
    }

    // Validación: verificar que el paciente es el dueño de la calificación
    if (calificacionExistente.paciente_id !== pacienteId) { // ✅ CORREGIDO
      throw new Error('No tienes permiso para modificar esta calificación');
    }

    // Validación: puntuación debe estar entre 1 y 5
    if (puntuacion !== undefined && (puntuacion < 1 || puntuacion > 5)) {
      throw new Error('La puntuación debe estar entre 1 y 5');
    }

    const transaction = await sequelize.transaction();
    
    try {
      const datosActualizar = {};
      
      if (puntuacion !== undefined) datosActualizar.puntuacion = puntuacion;
      if (comentario !== undefined) datosActualizar.comentario = comentario;

      const calificacionActualizada = await calificacionRepository.actualizarCalificacionProducto(
        id, 
        datosActualizar
      );

      // Si se actualizó la puntuación, recalcular el promedio del producto
      if (puntuacion !== undefined) {
        await calificacionRepository.actualizarPromedioProducto(calificacionExistente.producto_id); // ✅ CORREGIDO
      }

      await transaction.commit();
      
      return await calificacionRepository.obtenerCalificacionProductoPorId(id);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async eliminarCalificacionProducto(id, pacienteId) {
    const calificacionExistente = await calificacionRepository.obtenerCalificacionProductoPorId(id);
    
    if (!calificacionExistente) {
      throw new Error('Calificación no encontrada');
    }

    // Validación: verificar que el paciente es el dueño de la calificación
    if (calificacionExistente.paciente_id !== pacienteId) { // ✅ CORREGIDO
      throw new Error('No tienes permiso para eliminar esta calificación');
    }

    const transaction = await sequelize.transaction();
    
    try {
      const productoId = calificacionExistente.producto_id; // ✅ CORREGIDO
      
      await calificacionRepository.eliminarCalificacionProducto(id);
      
      // Recalcular el promedio del producto
      await calificacionRepository.actualizarPromedioProducto(productoId);

      await transaction.commit();
      
      return { mensaje: 'Calificación eliminada exitosamente' };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async obtenerCalificacionesPorPaciente(pacienteId, tipo = 'ambos') {
    return await calificacionRepository.obtenerCalificacionesPorPaciente(pacienteId, tipo);
  }
}

export default new CalificacionService();