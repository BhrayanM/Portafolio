const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Automation Platform API',
      version: '1.0.0',
      description: 'REST API of the Portafolio platform — lead management, authentication and billing',
    },
    servers: [
      { url: 'https://api.example.com', description: 'Production (local)' },
      { url: 'http://localhost:3000', description: 'Development' },
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
              description: 'Lead classification. Closed enum, canonical uppercase.',
            },
            ai_business_category: {
              type: 'string',
              maxLength: 100,
              description: 'Business sector. Free text emitted by the LLM, not a closed enum.',
              example: 'Software and Technology',
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
          responses: { 200: { description: 'API operational' } },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Sign in',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } },
          },
          responses: { 200: { description: 'Login successful, session cookie set' }, 401: { description: 'Invalid credentials' } },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register user',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' } } } } },
          },
          responses: { 201: { description: 'User created' } },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Sign out',
          responses: { 200: { description: 'Session cookie cleared' } },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Current user',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: { 200: { description: 'Authenticated user data' }, 401: { description: 'Not authenticated' } },
        },
      },
      '/api/leads': {
        get: {
          tags: ['Leads'],
          summary: 'List leads',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'status', schema: { type: 'string' } },
            { in: 'query', name: 'category', schema: { type: 'string', enum: ['HOT', 'WARM', 'COLD'] } },
            { in: 'query', name: 'search', schema: { type: 'string' } },
            { in: 'query', name: 'limit', schema: { type: 'integer' } },
            { in: 'query', name: 'offset', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'List of leads', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Lead' } } } } } },
        },
        post: {
          tags: ['Leads'],
          summary: 'Create lead',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateLeadInput' } } } },
          responses: { 201: { description: 'Lead created' }, 400: { description: 'Validation failed' } },
        },
      },
      '/api/leads/stats': {
        get: {
          tags: ['Leads'],
          summary: 'Lead statistics',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: { 200: { description: 'Statistics', content: { 'application/json': { schema: { '$ref': '#/components/schemas/LeadStats' } } } } },
        },
      },
      // Documenta el endpoint del dashboard de actividad. Sirve la
      // pantalla /dashboard/activity y lee de `lead_log`, la traza que escribe el
      // workflow de n8n (no de `leads`, que es el recurso del CRM).
      '/api/leads/activity': {
        get: {
          tags: ['Leads'],
          summary: 'Recent activity processed by the workflow',
          description: '`lead_log` entries, most recent first. Isolated per tenant via RLS.',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 } },
            { in: 'query', name: 'offset', schema: { type: 'integer', minimum: 0, default: 0 } },
          ],
          responses: {
            200: { description: 'Activity listing' },
            400: { description: 'Invalid pagination parameters' },
          },
        },
      },
      // Contrato alineado con el tipo `TenantUsage` del frontend.
      '/api/tenants/usage': {
        get: {
          tags: ['Tenants'],
          summary: 'Tenant resource usage',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: {
            200: {
              description: 'Tenant totals',
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
          summary: 'Get lead by ID',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Lead found' }, 404: { description: 'Not found' } },
        },
      },
      '/api/billing/plans': {
        get: {
          tags: ['Billing'],
          summary: 'List available plans',
          responses: { 200: { description: 'Plans' } },
        },
      },
      '/api/billing/subscription': {
        get: {
          tags: ['Billing'],
          summary: 'Current subscription',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: { 200: { description: 'Subscription data' } },
        },
      },
      '/api/billing/checkout': {
        post: {
          tags: ['Billing'],
          summary: 'Create checkout session',
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { plan: { type: 'string' } } } } } },
          responses: { 200: { description: 'Checkout URL' } },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
