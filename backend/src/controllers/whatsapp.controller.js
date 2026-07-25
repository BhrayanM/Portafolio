const whatsappService = require('../services/whatsapp.service');

const handleIncoming = async (req, res) => {
  try {
    const message = whatsappService.parseIncoming(req.body);
    if (!message) {
      return res.status(400).json({ error: 'Mensaje no válido' });
    }

    // El mensaje entrante se procesa via n8n webhook (/webhook/whatsapp-agent)
    // Este endpoint es el receptor desde WhatsApp Cloud API
    // n8n escucha en POST /webhook/whatsapp-agent con Fast ACK

    console.log(`[WhatsApp] Mensaje de ${message.from}: ${message.text}`);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[WhatsApp] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const result = whatsappService.verifyWebhook(mode, token, challenge);
  if (result !== null) {
    return res.status(200).send(result.toString());
  }

  res.status(403).send('Verificación fallida');
};

const sendMessage = async (req, res, next) => {
  try {
    const { to, text } = req.body;
    const result = await whatsappService.sendMessage(to, text);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const status = (req, res) => {
  res.json({
    configured: whatsappService.isConfigured(),
    phoneNumberId: whatsappService.getPhoneNumberId() || null,
  });
};

module.exports = { handleIncoming, verifyWebhook, sendMessage, status };
