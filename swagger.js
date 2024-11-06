const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Exchange Rate API',
      version: '1.0.0',
      description: 'Altın ve döviz API dokümantasyonu',
    },
    servers: [
      {
        url: 'http://localhost:5000', // Sunucunuzun adresi ve portu
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // Mevcut Portfolio ve PortfolioInput şemaları
        Portfolio: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            name: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        PortfolioInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              description: 'Portföy adı',
            },
          },
        },
        // Yeni ekleyeceğimiz Asset ve AssetInput şemaları
        Asset: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            portfolio: { type: 'string' },
            type: {
              type: 'string',
              description: 'Varlık türü (gold veya currency)',
            },
            name: {
              type: 'string',
              description: 'Varlık adı (örneğin, USD, Gram Altın)',
            },
            amount: {
              type: 'number',
              description: 'Varlık miktarı',
            },
            costPrice: {
              type: 'number',
              description: 'Maliyet fiyatı',
            },
            purchaseDate: {
              type: 'string',
              format: 'date-time',
              description: 'Alış tarihi',
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AssetInput: {
          type: 'object',
          required: ['type', 'name', 'amount'],
          properties: {
            type: {
              type: 'string',
              description: 'Varlık türü (gold veya currency)',
            },
            name: {
              type: 'string',
              description: 'Varlık adı (örneğin, USD, Gram Altın)',
            },
            amount: {
              type: 'number',
              description: 'Varlık miktarı',
            },
          },
        },
        // Yeni ekleyeceğimiz Rate şeması
        Rate: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            type: {
              type: 'string',
              description: 'Varlık türü (gold veya currency)',
            },
            name: {
              type: 'string',
              description: 'Varlık adı (örneğin, USD, Gram Altın)',
            },
            buyPrice: {
              type: 'number',
              description: 'Alış fiyatı',
            },
            sellPrice: {
              type: 'number',
              description: 'Satış fiyatı',
            },
            date: {
              type: 'string',
              format: 'date-time',
              description: 'Fiyatın geçerli olduğu tarih',
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'], // Swagger açıklamalarını içeren dosyaların yolu
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = (app) => {
  const swaggerUi = require('swagger-ui-express');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
