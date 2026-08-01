const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { list, getById, update } = require('../controllers/users.controller');

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

router.get('/', authorize('admin', 'manager'), list);
router.get('/:id', authorize('admin', 'manager'), getById);
router.patch('/:id', authorize('admin'), update);

module.exports = router;
