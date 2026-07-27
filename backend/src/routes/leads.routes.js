const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { validate } = require('../middleware/validate');
const { createLeadSchema, listQuerySchema, activityQuerySchema } = require('../schemas/lead.schema');
const { list, getById, stats, activity, create } = require('../controllers/leads.controller');

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

router.get('/', validate(listQuerySchema, 'query'), list);
router.get('/stats', stats);
// F22 R-07 — ANTES de '/:id'. Express casa por orden: si fuese despues, la cadena
// "activity" entraria como parametro `id` y getById respondaria 404 (o un error de
// UUID invalido). Es el mismo motivo por el que '/stats' ya estaba arriba.
router.get('/activity', validate(activityQuerySchema, 'query'), activity);
router.get('/:id', getById);
router.post('/', validate(createLeadSchema), create);

module.exports = router;
