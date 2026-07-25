const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { catalog, install, installed } = require('../controllers/marketplace.controller');

const router = Router();

router.get('/catalog', catalog);
router.get('/installed', authenticate, resolveTenant, installed);
router.post('/install', authenticate, resolveTenant, install);

module.exports = router;
