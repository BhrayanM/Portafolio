const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { getCurrent, update, getSettings, updateSettings, usage } = require('../controllers/tenants.controller');

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

router.get('/', getCurrent);
router.get('/settings', getSettings);
router.patch('/settings', authorize('admin'), updateSettings);
router.get('/usage', usage);
router.patch('/', authorize('admin'), update);

module.exports = router;
