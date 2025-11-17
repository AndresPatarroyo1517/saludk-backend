import 'dotenv/config';
import app from './src/app.js';
import { sequelize, connectWithRetry } from './src/database/database.js';
import logger from './src/utils/logger.js';
import marcarOrdenesFallidas from './src/jobs/cancelarOrdenesPendientes.js';
import iniciarLimpiezaDocumentos from './src/jobs/limpiezaDocumentosJob.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {

  console.log('Iniciando backend SaludK...');
  try {
    await connectWithRetry();
    marcarOrdenesFallidas();
    iniciarLimpiezaDocumentos.iniciar();

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('✅ Database models synchronized');
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Server corriendo en: ${PORT}`);
      logger.info(`📚 Documentación API: http://localhost:${PORT}/api/docs`);
      logger.info(`🔧 Entorno: ${process.env.NODE_ENV}`);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

startServer();