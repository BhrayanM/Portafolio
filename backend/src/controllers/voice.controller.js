const voiceService = require('../services/voice.service');

const handleIncoming = async (req, res) => {
  try {
    const call = voiceService.parseIncoming(req.body);
    if (!call) {
      return res.status(400).json({ error: 'Payload no válido' });
    }

    // Llamada entrante procesada via n8n webhook (/webhook/voice-receptionist)
    console.log(`[Voice] Llamada de ${call.from}: ${call.callStatus}`);

    // Twilio espera TwiML como respuesta
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="es-MX">Bienvenido a Portafolio. Estamos procesando su llamada.</Say>
</Response>`);
  } catch (error) {
    console.error('[Voice] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const makeCall = async (req, res, next) => {
  try {
    const { to, webhookUrl } = req.body;
    const result = await voiceService.makeCall(to, webhookUrl || `${req.protocol}://${req.get('host')}/api/voice/webhook`);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const status = (req, res) => {
  res.json({
    configured: voiceService.isConfigured(),
    phoneNumber: voiceService.getPhoneNumber() || null,
  });
};

module.exports = { handleIncoming, makeCall, status };
