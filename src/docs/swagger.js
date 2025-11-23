import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';

// __dirname replacement for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construimos rutas para los archivos de rutas (forzar notación POSIX para compatibilidad en Windows)
const basePathPosix = __dirname.replace(/\\/g, '/');
const routesGlob = `${basePathPosix}/../routes/*.js`;
// Añadimos un glob más amplio para cubrir todos los archivos JS en `src` (ayuda cuando los archivos están en subcarpetas)
const allSrcGlob = `${basePathPosix}/../**/*.js`;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SaludK API',
      version: '1.0.0',
      description: 'Documentación automática de la API generada desde comentarios JSDoc en las rutas',
    },
    // Añadimos servers para que Swagger UI sepa el esquema/host por defecto
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Local server',
      },
    ],
  },
  apis: [routesGlob, allSrcGlob], // rutas donde están tus endpoints documentados
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
