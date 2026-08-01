const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { handleIncoming, makeCall, status } = require('../controllers/voice.controller');

const router = Router();

// Twilio webhook — sin auth, lo llama Twilio directamente
router.post('/webhook', handleIncoming);

// Rutas protegidas
router.get('/status', authenticate, resolveTenant, status);
router.post('/call', authenticate, resolveTenant, makeCall);

module.exports = router;
