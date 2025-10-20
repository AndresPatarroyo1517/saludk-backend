const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');
const requestLogger = require('./middlewares/requestLogger');
const rateLimiter = require('./middlewares/rateLimiter');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');


const app = express();

       
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true,
  },
}));


const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',')
      : ['http://localhost:4200'];
    
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
};

app.use(cors(corsOptions));

app.use(mongoSanitize()); 
app.use(xss()); 
app.use(hpp()); 

app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

app.use(requestLogger);

app.set('trust proxy', 1);

app.use('/api/', rateLimiter.global);


app.use(auditMiddleware);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

app.get('/ready', async (req, res) => {
  try {
    const { sequelize } = require('./models');
    const redisClient = require('./config/redis');

    await sequelize.authenticate();
    
    await redisClient.ping();

    res.status(200).json({
      success: true,
      status: 'ready',
      services: {
        database: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      success: false,
      status: 'not ready',
      error: error.message,
    });
  }
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SaludK API Documentation',
}));

app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

if (process.env.NODE_ENV === 'development') {
  try {
    const queues = require('./jobs');
    
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: Object.values(queues).map(queue => new BullAdapter(queue)),
      serverAdapter: serverAdapter,
    });

    app.use('/admin/queues', serverAdapter.getRouter());
    logger.info('📊 Bull Board available at /admin/queues');
  } catch (error) {
    logger.warn('Bull Board not initialized:', error.message);
  }
}

app.use('/api/v1', routes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SaludK API',
    version: '1.0.0',
    documentation: '/api/docs',
    timestamp: new Date().toISOString(),
  });
});

app.post('/admin/cache/invalidate', async (req, res) => {
  try {
    const { namespace } = req.body;
    
    if (!namespace) {
      return res.status(400).json({ 
        success: false,
        error: 'namespace requerido' 
      });
    }

    const cacheService = require('./services/cache.service');
    const removed = await cacheService.invalidateNamespace(namespace);
    
    logger.info(`Cache namespace invalidated: ${namespace}`);
    
    res.json({ 
      success: true, 
      removed,
      namespace 
    });
  } catch (error) {
    logger.error('Error invalidating cache:', error);
    res.status(500).json({
      success: false,
      error: 'Error al invalidar cache',
    });
  }
});

if (process.env.NODE_ENV === 'development') {
  app.post('/admin/cache/flush', async (req, res) => {
    try {
      const redisClient = require('./config/redis');
      await redisClient.flushall();
      
      logger.warn('⚠️  CACHE FLUSHED COMPLETELY');
      
      res.json({ 
        success: true, 
        message: 'Cache flushed completely' 
      });
    } catch (error) {
      logger.error('Error flushing cache:', error);
      res.status(500).json({
        success: false,
        error: 'Error al limpiar cache',
      });
    }
  });
}

app.use("/hola", (req, res) => {
  res.json({
    success: true,
    message: 'Hola Mundo',
    timestamp: new Date().toISOString(),
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

app.use(errorHandler);


process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;