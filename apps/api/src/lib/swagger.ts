import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WinkX AI API',
      version: '1.0.0',
      description: 'Complete REST API for WinkX AI — the premium WhatsApp, Instagram & Facebook automation platform',
      contact: {
        name: 'WinkX AI Support',
        email: 'support@winkx.ai',
      },
    },
    servers: [
      { url: process.env.API_URL || 'http://localhost:4000', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/routes/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export function configureSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: `
      .swagger-ui .topbar { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
      .swagger-ui .topbar-wrapper img { content: url("data:image/svg+xml;base64,..."); }
    `,
    customSiteTitle: 'WinkX AI API Docs',
  }));
  app.get('/api/docs.json', (_, res) => res.json(swaggerSpec));
}
