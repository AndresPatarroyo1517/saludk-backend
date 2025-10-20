const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tu API',
      version: '1.0.0',
    },
  },
  apis: ['./routes/*.js'], // rutas donde están tus endpoints documentados
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
