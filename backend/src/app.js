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
const marketplaceRoutes = require('./routes/marketplace.routes');
const { errorHandler } = require('./middleware/errorHandler');
const { securityMiddleware } = require('./middleware/security');
const { globalLimiter } = require('./middleware/rateLimit');
const { NotFoundError } = require('./utils/errors');
const swaggerSpec = require('./docs/swagger');

const app = express();

securityMiddleware(app);
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(morgan('dev'));

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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Portafolio API Docs' }));

app.use('/api', globalLimiter);

app.get('/health', (req, res) => {
  const { pool } = require('./db');
  pool.query('SELECT 1')
    .then(() => res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() }))
    .catch(() => res.status(503).json({ status: 'error', db: 'disconnected', timestamp: new Date().toISOString() }));
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/keys', apiKeysRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/marketplace', marketplaceRoutes);

app.use((req, res, next) => {
  next(new NotFoundError(`Ruta ${req.originalUrl} no encontrada`));
});

app.use(errorHandler);

module.exports = app;
