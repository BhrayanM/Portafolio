const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { list, getById, stats } = require('../controllers/leads.controller');

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

router.get('/', list);
router.get('/stats', stats);
router.get('/:id', getById);

module.exports = router;
