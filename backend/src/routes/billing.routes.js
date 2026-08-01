const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { validate } = require('../middleware/validate');
const { createCheckoutSchema } = require('../schemas/billing.schema');
// `handleWebhook` no se importa aqui: la ruta /api/billing/webhook se registra en app.js,
// antes de express.json(), porque Stripe necesita el body raw para verificar la firma.
const { createCheckout, getSubscription, getPlans } = require('../controllers/billing.controller');

const router = Router();

router.get('/plans', getPlans);
router.get('/subscription', authenticate, resolveTenant, getSubscription);
router.post('/checkout', authenticate, resolveTenant, validate(createCheckoutSchema), createCheckout);

module.exports = router;
