const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
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
const { NotFoundError } = require('./utils/errors');

const app = express();

securityMiddleware(app);
// Con cookies de sesion el navegador exige un origen explicito: '*' no vale con credentials.
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
