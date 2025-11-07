/** @type {import('next-swagger-doc').SwaggerConfig} */
const swaggerConfig = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UFLOW API Documentation',
      version: '1.0.0',
      description: 'API documentation for UFLOW - Community Services Platform',
      contact: {
        name: 'API Support',
        email: 'support@ummahflow.com',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://ummahflow.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'sb-access-token',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
        cookieAuth: [],
      },
    ],
  },
  apiFolder: 'src/app/api',
  schemaFolders: ['src/types'],
};
module.exports = swaggerConfig;

