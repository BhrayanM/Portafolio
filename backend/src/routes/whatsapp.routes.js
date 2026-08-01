const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { handleIncoming, verifyWebhook, sendMessage, status } = require('../controllers/whatsapp.controller');

const router = Router();

// Meta webhook verification (GET) e incoming messages (POST) — sin auth, las llama WhatsApp
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleIncoming);

// Rutas protegidas para API interna
router.get('/status', authenticate, resolveTenant, status);
router.post('/send', authenticate, resolveTenant, sendMessage);

module.exports = router;
