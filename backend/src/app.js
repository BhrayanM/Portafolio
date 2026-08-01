const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const leadsRoutes = require('./routes/leads.routes');
const tenantsRoutes = require('./routes/tenants.routes');
const apiKeysRoutes = require('./routes/apiKeys.routes');
const billingRoutes = require('./routes/billing.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const voiceRoutes = require('./routes/voice.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const { authenticate } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { securityMiddleware } = require('./middleware/security');
const { globalLimiter } = require('./middleware/rateLimit');
const { csrfProtection } = require('./middleware/csrf');
const { requestId } = require('./middleware/requestId');
const { getMetrics } = require('./controllers/metrics.controller');
const { NotFoundError } = require('./utils/errors');
const swaggerSpec = require('./docs/swagger');

const app = express();

// Detras de nginx, `req.ip` seria la IP del contenedor proxy y no la del cliente:
// el rate limiter contaria a todo el mundo en el mismo cubo. Con `trust proxy`
// Express resuelve `req.ip` desde X-Forwarded-For. Se configura por entorno y
// viene desactivado por defecto (ver config/index.js), porque activarlo sin un
// proxy delante permitiria falsear la IP con una cabecera.
app.set('trust proxy', config.trustProxy);

securityMiddleware(app);
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(requestId);
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :req[x-request-id]'));

// Stripe webhook necesita el body raw para verificar firma — debe ir ANTES de express.json()
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    await require('./controllers/billing.controller').handleWebhook(req, res);
  } catch (error) {
    next(error);
  }
});

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// CSRF: peticiones mutantes con cookie de sesión requieren Origin autorizado
// (same-origin o CORS_ORIGINS). El webhook de Stripe queda fuera por diseño:
// se verifica por firma y no usa cookies. Ver middleware/csrf.js.
app.use(csrfProtection);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Portafolio API Docs' }));

app.use('/api', globalLimiter);

app.get('/health', (req, res) => {
  const { pool } = require('./db');
  pool.query('SELECT 1')
    .then(() => res.json({
      status: 'ok',
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
      db: 'connected',
      timestamp: new Date().toISOString(),
    }))
    .catch(() => res.status(503).json({
      status: 'error',
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
      db: 'disconnected',
      timestamp: new Date().toISOString(),
    }));
});

// Requiere autenticacion: expone hostname, PID, version de Node y plataforma,
// que es reconocimiento util para un atacante (version -> CVEs conocidos).
app.get('/api/metrics', authenticate, getMetrics);

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/keys', apiKeysRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/marketplace', marketplaceRoutes);

app.use((req, res, next) => {
  next(new NotFoundError(`Ruta ${req.originalUrl} no encontrada`));
});

app.use(errorHandler);

module.exports = app;
