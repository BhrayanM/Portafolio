const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { validate } = require('../middleware/validate');
const { createLeadSchema, listQuerySchema } = require('../schemas/lead.schema');
const { list, getById, stats, create } = require('../controllers/leads.controller');

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

router.get('/', validate(listQuerySchema, 'query'), list);
router.get('/stats', stats);
router.get('/:id', getById);
router.post('/', validate(createLeadSchema), create);

module.exports = router;
