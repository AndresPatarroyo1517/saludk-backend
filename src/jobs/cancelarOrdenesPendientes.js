import cron from 'node-cron';
import { sequelize } from '../database/database.js';
import logger from '../utils/logger.js';

/**
 * Job automático que marca como FALLIDA las órdenes de pago pendientes después de 5 días
 * Se ejecuta cada 6 horas
 */
const marcarOrdenesFallidas = () => {
  // Expresión cron: '0 */6 * * *' = Cada 6 horas
  // Alternativas:
  // '0 0 * * *'    -> Cada día a medianoche
  // '0 */12 * * *' -> Cada 12 horas
  // '*/30 * * * *' -> Cada 30 minutos (para testing)
  
  cron.schedule('0 0 * * *', async () => {
    const inicioEjecucion = new Date();
    logger.info(`[${inicioEjecucion.toISOString()}] 🔄 Iniciando job: Marcar órdenes pendientes como fallidas`);
    
    try {
      // Ejecutar query raw con Sequelize
      const [resultados, metadata] = await sequelize.query(`
        UPDATE orden_pago 
        SET 
          estado = 'FALLIDA',
          fecha_actualizacion = now()
        WHERE 
          estado = 'PENDIENTE' 
          AND fecha_creacion < (now() - INTERVAL '5 days')
        RETURNING 
          id, 
          tipo_orden, 
          monto, 
          paciente_id,
          fecha_creacion
      `);
      
      const cantidad = resultados.length;
      
      if (cantidad > 0) {
        logger.info(`✅ Se marcaron ${cantidad} órdenes como FALLIDA exitosamente`);
        
        // Log detallado de cada orden actualizada
        resultados.forEach((orden, index) => {
          logger.info(`   ${index + 1}. ID: ${orden.id}`);
          logger.info(`      └─ Tipo: ${orden.tipo_orden}, Monto: $${parseFloat(orden.monto).toFixed(2)}`);
          logger.info(`      └─ Paciente: ${orden.paciente_id}`);
          logger.info(`      └─ Creada: ${new Date(orden.fecha_creacion).toLocaleString('es-CO')}`);
        });
        
        // Opcional: Enviar notificaciones a los pacientes
        // await notificarPacientesOrdenFallida(resultados);
        
        // Opcional: Registrar en tabla de auditoría
        // await registrarAuditoriaFallidas(resultados);
        
      } else {
        logger.info('ℹ️  No hay órdenes pendientes para marcar como fallidas');
      }
      
      const tiempoEjecucion = Date.now() - inicioEjecucion.getTime();
      logger.info(`[${new Date().toISOString()}] ✔️  Job finalizado en ${tiempoEjecucion}ms\n`);
      
    } catch (error) {
      logger.error(`❌ Error al marcar órdenes como fallidas: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
      
      // Opcional: Enviar alerta a sistema de monitoreo (Sentry, New Relic, etc.)
      // await enviarAlertaError({
      //   tipo: 'JOB_ORDENES_FALLIDAS',
      //   error: error.message,
      //   timestamp: new Date()
      // });
    }
  });
  
  logger.info('📅 Job programado: Marcar órdenes pendientes como FALLIDA después de 5 días (cada 6 horas)');
};

export default marcarOrdenesFallidas;