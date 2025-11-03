import cron from 'node-cron';
import { Op } from 'sequelize';
import db from '../models/index.js';
import { eliminarArchivo, extraerKeyDeURL } from '../services/storjService.js';
import logger from '../utils/logger.js';

const { Documento } = db;

/**
 * Job que limpia documentos RECHAZADOS después de 2 días
 * Corre diariamente a las 3:00 AM
 */
class LimpiezaDocumentosJob {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Ejecutar limpieza
   */
  async ejecutar() {
    if (this.isRunning) {
      logger.warn('Job de limpieza ya está corriendo. Saltando ejecución.');
      return;
    }

    this.isRunning = true;
    logger.info('Iniciando job de limpieza de documentos rechazados...');

    try {
      // Calcular fecha hace 2 días
      const hace2Dias = new Date();
      hace2Dias.setDate(hace2Dias.getDate() - 2);

      // Buscar documentos RECHAZADOS con más de 2 días
      const documentosViejos = await Documento.findAll({
        where: {
          estado: 'RECHAZADO',
          fecha_carga: { 
            [Op.lt]: hace2Dias 
          }
        }
      });

      logger.info(`Encontrados ${documentosViejos.length} documentos rechazados para eliminar`);

      let exitosos = 0;
      let fallidos = 0;

      for (const doc of documentosViejos) {
        try {
          // Extraer key de Storj de la URL
          const key = extraerKeyDeURL(doc.ruta_storj);
          
          if (!key) {
            logger.warn(`No se pudo extraer key de: ${doc.ruta_storj}`);
            fallidos++;
            continue;
          }

          // Eliminar de Storj
          await eliminarArchivo(key);

          // Eliminar de BD
          await doc.destroy();

          exitosos++;
          logger.info(`Documento eliminado: ${doc.id} (${doc.nombre})`);
        } catch (error) {
          fallidos++;
          logger.error(`Error al eliminar documento ${doc.id}: ${error.message}`);
        }
      }

      logger.info(`Job completado. Exitosos: ${exitosos}, Fallidos: ${fallidos}`);
    } catch (error) {
      logger.error(`Error en job de limpieza: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Iniciar cron job
   */
  iniciar() {
    // Cron: Todos los días a las 3:00 AM
    // Formato: segundo minuto hora día mes díaSemana
    cron.schedule('0 0 3 * * *', async () => {
      await this.ejecutar();
    });

    logger.info('Job de limpieza de documentos programado para las 3:00 AM diariamente');
  }
}

export default new LimpiezaDocumentosJob();