const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' 
      ? {
          require: true,
          rejectUnauthorized: false
        }
      : false,
    application_name: 'saludK-backend',
    statement_timeout: 30000,
  },
  pool: {
    max: 20,           
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
  logging: (msg) => logger.debug(msg),
  benchmark: true,
  retry: {
    max: 3,
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
      /TimeoutError/,
      /SERIALIZATION_FAILURE/, 
    ],
  },
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
  },
});

const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      logger.info('Conexión con CockroachDB establecida exitosamente');
      return;
    } catch (error) {
      logger.error(`Conexión con CockroachDB fallida (intento ${i + 1}/${retries}):`, error.message);
      if (i < retries - 1) {
        logger.info(`Reintentando en ${delay / 1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
};

module.exports = { sequelize, connectWithRetry };