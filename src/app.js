import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import hpp from 'hpp';
import logger from './utils/logger.js';
import errorHandler from './middlewares/errorHandler.js';
import requestLogger from './middlewares/requestLogger.js';
import SuscripcionRoutes from './routes/suscripcionRoutes.js';
import PlanRoutes from './routes/planRoutes.js';
import registroRoutes from './routes/registroRoutes.js';
import ProductosRoutes from './routes/productosRoutes.js';
import validacionRoute from './routes/validacionRoutes.js';
import loginRoutes from './routes/loginRoutes.js';
import citaRoutes from './routes/citaRoutes.js'; 
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './docs/swagger.js';
import cookieParser from 'cookie-parser';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import pagoRutas from './routes/pagoRutas.js';
import kpiRoutes from './routes/kpiRoutes.js';

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
    maxAge: 31536000, 
    includeSubDomains: true,
    preload: true,
  },
}));


const corsOptions = {
  origin: (origin, callback) => {
    // En desarrollo permitimos cualquier origen para facilitar pruebas desde Swagger UI
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    const allowedOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',')
      : ['http://localhost:4200', `http://localhost:${process.env.PORT || 3000}`, `http://127.0.0.1:${process.env.PORT || 3000}`];

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
app.use(hpp()); 
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

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
    const dbModule = await import('../database/database.js');
    const { sequelize } = dbModule;

    const redisModule = await import('./config/redisClient.js');
    const redisClient = redisModule.default || redisModule;

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
    const jobsModule = await import('./jobs.js');
    const queues = jobsModule.default || jobsModule;

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
}else{
  limpiezaDocumentosJob.iniciar();
}

//app.use('/api/v1', routes);

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

  const cacheModule = await import('./services/cache.service.js');
  const cacheService = cacheModule.default || cacheModule;
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
  const redisModule = await import('./config/redisClient.js');
  const redisClient = redisModule.default || redisModule;
  if (redisClient.flushall) await redisClient.flushall();
  else if (typeof redisClient.flushAll === 'function') await redisClient.flushAll();
      
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

app.get("/hola", (req, res) => {
  res.json({
    success: true,
    message: 'Hola Mundo',
    timestamp: new Date().toISOString(),
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

//--------------------------------------------------Usar aqui las rutas que se creen---------------------------------

app.use('/suscripcion', SuscripcionRoutes);
app.use('/planes', PlanRoutes);
app.use('/registro', registroRoutes);
app.use('/productos', ProductosRoutes);
app.use('/validacion', validacionRoute);
app.use('/cita', citaRoutes);
app.use('/pagos', pagoRutas);
app.use('/login', loginRoutes);
app.use('/metricas', kpiRoutes);


export default app;