const { authenticate } = require('../middleware/auth');
const { authenticateApiKey } = require('../middleware/apiKey');

// Usar en rutas que acepten tanto JWT como API Key
router.use([authenticate, authenticateApiKey]);
