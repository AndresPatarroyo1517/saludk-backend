const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
require('dotenv').config();

// Variables de entorno
const username = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;
const host = process.env.DB_HOST;
const port = process.env.DB_PORT || 26257;
const database = process.env.DB_NAME;
const sslEnabled = process.env.DB_SSL_ENABLED !== 'false'; // Por defecto true

// Validar variables de entorno críticas
if (!username || !password || !host || !database) {
  logger.error('Faltan variables de entorno requeridas para la conexión a la base de datos');
  throw new Error('Configuración de base de datos incompleta. Revise las variables de entorno.');
}

// Configuración de Sequelize para CockroachDB
const sequelize = new Sequelize(database, username, password, {
  host: host,
  port: port,
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: sslEnabled ? {
      require: true,
      rejectUnauthorized: false
    } : false,
    application_name: 'saludK-backend',
    statement_timeout: 30000, // 30 segundos
    idle_in_transaction_session_timeout: 30000,
  },
  pool: {
    max: 20,              // Conexiones máximas
    min: 5,               // Conexiones mínimas
    acquire: 30000,       // Tiempo máximo para adquirir conexión (30s)
    idle: 10000,          // Tiempo máximo de inactividad (10s)
    evict: 1000,          // Tiempo de verificación de conexiones inactivas (1s)
  },
  logging: (msg) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(msg);
    }
  },
  benchmark: process.env.NODE_ENV !== 'production', // Solo en desarrollo
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
      /ECONNREFUSED/,
      /ETIMEDOUT/,
      /EHOSTUNREACH/,
      /SERIALIZATION_FAILURE/, // Específico de CockroachDB
      /40001/, // Código de error de serialización de CockroachDB
    ],
  },
  define: {
    timestamps: false,      // Usamos campos personalizados
    underscored: false,
    freezeTableName: true,
  },
  transactionType: 'IMMEDIATE',
});

/**
 * Función para conectar a la base de datos con reintentos
 * @param {number} retries - Número de reintentos
 * @param {number} delay - Tiempo de espera entre reintentos (ms)
 */
const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      logger.info(`✅ Conexión con CockroachDB establecida exitosamente`);
      logger.info(`📊 Base de datos: ${database}`);
      logger.info(`🖥️  Host: ${host}:${port}`);
      logger.info(`🔒 SSL: ${sslEnabled ? 'Habilitado' : 'Deshabilitado'}`);
      return;
    } catch (error) {
      logger.error(`❌ Conexión con CockroachDB fallida (intento ${i + 1}/${retries}): ${error.message}`);
      
      if (i < retries - 1) {
        logger.info(`⏳ Reintentando en ${delay / 1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.error('💥 No se pudo establecer conexión con la base de datos después de varios intentos');
        throw new Error(`Fallo al conectar con CockroachDB: ${error.message}`);
      }
    }
  }
};

/**
 * Función para cerrar la conexión de forma segura
 */
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('🔌 Conexión con CockroachDB cerrada correctamente');
  } catch (error) {
    logger.error(`Error al cerrar la conexión: ${error.message}`);
    throw error;
  }
};

module.exports = { 
  sequelize, 
  connectWithRetry,
  closeConnection 
};