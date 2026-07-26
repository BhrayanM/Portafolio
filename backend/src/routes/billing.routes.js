const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { createCheckout, handleWebhook, getSubscription, getPlans } = require('../controllers/billing.controller');

const router = Router();

router.get('/plans', getPlans);
router.get('/subscription', authenticate, resolveTenant, getSubscription);
router.post('/checkout', authenticate, resolveTenant, createCheckout);
router.post('/webhook', handleWebhook);

module.exports = router;
