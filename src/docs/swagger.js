const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

// Construimos rutas absolutas para evitar problemas de paths relativos
const routesGlob = path.join(__dirname, '..', 'routes', '*.js');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SaludK API',
      version: '1.0.0',
      description: 'Documentación automática de la API generada desde comentarios JSDoc en las rutas',
    },
  },
  apis: [routesGlob], // rutas donde están tus endpoints documentados
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
