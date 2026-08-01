const whatsappService = require('../services/whatsapp.service');
const { logger } = require('../utils/logger');
const { maskPhone } = require('../utils/redact');

const handleIncoming = async (req, res) => {
  try {
    const message = whatsappService.parseIncoming(req.body);
    if (!message) {
      return res.status(400).json({ error: 'Mensaje no válido' });
    }

    // No se loguea el texto del mensaje (contenido del usuario) ni el
    // telefono completo. Se deja solo lo necesario para operar: id, tipo y
    // telefono enmascarado, que basta para correlacionar sin guardar PII.
    logger.info('WhatsApp incoming message', {
      messageId: message.messageId,
      from: maskPhone(message.from),
      type: message.type,
      textLength: (message.text || '').length,
    });

    res.status(200).json({ received: true });
  } catch (error) {
    // Mismo criterio: el detalle va al log, al cliente solo un mensaje
    // generico. `error.message` puede arrastrar internos de la API de Meta.
    logger.error('WhatsApp error', { error: error.message });
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
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
