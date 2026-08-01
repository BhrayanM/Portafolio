const config = require('../config');

const WHATSAPP_API = 'https://graph.facebook.com/v18.0';

class WhatsAppService {
  getToken() {
    return process.env.WHATSAPP_TOKEN;
  }

  getPhoneNumberId() {
    return process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  isConfigured() {
    return !!(this.getToken() && this.getPhoneNumberId());
  }

  async sendMessage(to, body) {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp no configurado. Define WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID en .env');
    }

    const response = await fetch(`${WHATSAPP_API}/${this.getPhoneNumberId()}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${error}`);
    }

    return response.json();
  }

  verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'portafolio_verify_2024';
    if (mode === 'subscribe' && token === verifyToken) {
      return parseInt(challenge);
    }
    return null;
  }

  parseIncoming(payload) {
    if (!payload?.entry?.[0]?.changes?.[0]?.value) return null;

    const change = payload.entry[0].changes[0].value;
    if (!change.messages?.[0]) return null;

    const message = change.messages[0];
    const contact = change.contacts?.[0];

    return {
      messageId: message.id,
      from: message.from,
      text: message.text?.body || '',
      type: message.type || 'text',
      timestamp: message.timestamp,
      profileName: contact?.profile?.name || '',
    };
  }
}

module.exports = new WhatsAppService();
