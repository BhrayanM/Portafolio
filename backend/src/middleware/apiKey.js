const apiKeysService = require('../services/apiKeys.service');

const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return next(); // No API key, continuar con otros métodos de auth
    }

    const tenant = await apiKeysService.validate(apiKey);
    if (!tenant) {
      return res.status(401).json({ error: { code: 'INVALID_API_KEY', message: 'Invalid or revoked API key' } });
    }

    req.tenantId = tenant.id;
    req.tenant = tenant;
    req.authMethod = 'api_key';
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticateApiKey };
