const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { list, create, revoke } = require('../controllers/apiKeys.controller');

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

router.get('/', list);
router.post('/', authorize('admin'), create);
router.delete('/', authorize('admin'), revoke);

module.exports = router;
