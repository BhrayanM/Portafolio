const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Portafolio SaaS API',
      version: '1.0.0',
      description: 'API REST del sistema Portafolio — gestion de leads, autenticacion y facturacion',
    },
    servers: [
      { url: 'https://api.example.com', description: 'Produccion local' },
      { url: 'http://localhost:3000', description: 'Desarrollo' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'access_token' },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        Lead: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            company: { type: 'string' },
            phone: { type: 'string' },
            source: { type: 'string' },
            ai_score: { type: 'integer' },
            ai_category: {
              type: 'string',
              enum: ['HOT', 'WARM', 'COLD'],
              description: 'Clasificacion del lead. Enum cerrado, canonico en mayusculas.',
            },
            ai_business_category: {
              type: 'string',
              maxLength: 100,
              description: 'Sector de negocio. Texto libre emitido por el LLM, no es un enum cerrado.',
              example: 'Software y Tecnologia',
            },
            status: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        LeadStats: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            new: { type: 'integer' },
            hot: { type: 'integer' },
            warm: { type: 'integer' },
            cold: { type: 'integer' },
            avg_score: { type: 'integer' },
            today: { type: 'integer' },
          },
        },
        CreateLeadInput: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string', maxLength: 255 },
            company: { type: 'string', maxLength: 255 },
            phone: { type: 'string', maxLength: 50 },
            message: { type: 'string', maxLength: 5000 },
            source: { type: 'string', maxLength: 100 },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          responses: { 200: { description: 'API operativa' } },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Iniciar sesion',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } },
          },
          responses: { 200: { description: 'Login exitoso, cookie seteada' }, 401: { description: 'Credenciales invalidas' } },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Registrar usuario',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' } } } } },
          },
          responses: { 201: { description: 'Usuario creado' } },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Cerrar sesion',
          responses: { 200: { description: 'Cookie eliminada' } },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Usuario actual',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: { 200: { description: 'Datos del usuario autenticado' }, 401: { description: 'No autenticado' } },
        },
      },
      '/api/leads': {
        get: {
          tags: ['Leads'],
          summary: 'Listar leads',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'status', schema: { type: 'string' } },
            { in: 'query', name: 'category', schema: { type: 'string', enum: ['HOT', 'WARM', 'COLD'] } },
            { in: 'query', name: 'search', schema: { type: 'string' } },
            { in: 'query', name: 'limit', schema: { type: 'integer' } },
            { in: 'query', name: 'offset', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Lista de leads', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Lead' } } } } } },
        },
        post: {
          tags: ['Leads'],
          summary: 'Crear lead',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateLeadInput' } } } },
          responses: { 201: { description: 'Lead creado' }, 400: { description: 'Validacion fallida' } },
        },
      },
      '/api/leads/stats': {
        get: {
          tags: ['Leads'],
          summary: 'Estadisticas de leads',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: { 200: { description: 'Estadisticas', content: { 'application/json': { schema: { '$ref': '#/components/schemas/LeadStats' } } } } },
        },
      },
      // F22 R-07 — Documenta el endpoint implementado en esta fase. Sirve la
      // pantalla /dashboard/activity y lee de `lead_log`, la traza que escribe el
      // workflow de n8n (no de `leads`, que es el recurso del CRM).
      '/api/leads/activity': {
        get: {
          tags: ['Leads'],
          summary: 'Actividad reciente procesada por el workflow',
          description: 'Entradas de `lead_log`, mas recientes primero. Aisladas por tenant via RLS.',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 } },
            { in: 'query', name: 'offset', schema: { type: 'integer', minimum: 0, default: 0 } },
          ],
          responses: {
            200: { description: 'Listado de actividad' },
            400: { description: 'Parametros de paginacion invalidos' },
          },
        },
      },
      // F22 R-08 — Contrato real, alineado con el tipo `TenantUsage` del frontend.
      '/api/tenants/usage': {
        get: {
          tags: ['Tenants'],
          summary: 'Consumo de recursos del tenant',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: {
            200: {
              description: 'Totales del tenant',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      total_leads: { type: 'integer' },
                      total_runs: { type: 'integer' },
                      total_users: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/leads/{id}': {
        get: {
          tags: ['Leads'],
          summary: 'Obtener lead por ID',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Lead encontrado' }, 404: { description: 'No encontrado' } },
        },
      },
      '/api/billing/plans': {
        get: {
          tags: ['Billing'],
          summary: 'Listar planes disponibles',
          responses: { 200: { description: 'Planes' } },
        },
      },
      '/api/billing/subscription': {
        get: {
          tags: ['Billing'],
          summary: 'Suscripcion actual',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: { 200: { description: 'Datos de suscripcion' } },
        },
      },
      '/api/billing/checkout': {
        post: {
          tags: ['Billing'],
          summary: 'Crear sesion de checkout',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { plan: { type: 'string' } } } } } },
          responses: { 200: { description: 'URL de checkout' } },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
