import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Solo crear directorio y archivos si NO estamos en producción
const isProduction = process.env.NODE_ENV === 'production';
const logsDir = path.join(__dirname, '../../logs');

if (!isProduction && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `[${timestamp}] ${level}: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata, null, 2)}`;
    }
    return msg;
  })
);

const prodFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    const metaString = Object.keys(metadata).length > 0 
      ? JSON.stringify(metadata) 
      : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaString}`;
  })
);

const transports = [];

// Console SIEMPRE (para que Vercel/producción capture stdout)
transports.push(
  new winston.transports.Console({
    format: isProduction ? prodFormat : devFormat,
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  })
);

// Archivos SOLO si NO estamos en producción
if (!isProduction) {
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
    })
  );

  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    })
  );

  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: prodFormat,
      maxSize: '50m',
      maxFiles: '90d',
      zippedArchive: true,
      level: 'info',
    })
  );
}

const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transports,
  exitOnError: false,
  format: isProduction ? prodFormat : devFormat,
});

logger.audit = (action, entity, metadata = {}) => {
  logger.info(`[AUDIT] ${action} - ${entity}`, {
    audit: true,
    action,
    entity,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

logger.security = (event, metadata = {}) => {
  logger.warn(`[SECURITY] ${event}`, {
    security: true,
    event,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

logger.performance = (operation, duration, metadata = {}) => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger[level](`[PERFORMANCE] ${operation} - ${duration}ms`, {
    performance: true,
    operation,
    duration,
    ...metadata,
  });
};

logger.metric = (metricName, value, metadata = {}) => {
  logger.info(`[METRIC] ${metricName}: ${value}`, {
    metric: true,
    metricName,
    value,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Exception/rejection handlers SOLO si NO estamos en producción
if (!isProduction) {
  logger.exceptions.handle(
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
    })
  );

  logger.rejections.handle(
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
    })
  );
}

if (process.env.NODE_ENV !== 'test') {
  logger.info('='.repeat(50));
  logger.info('Logger initialized successfully');
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Log Level: ${logger.level}`);
  if (!isProduction) {
    logger.info(`Logs Directory: ${logsDir}`);
  }
  logger.info('='.repeat(50));
}

export default logger;