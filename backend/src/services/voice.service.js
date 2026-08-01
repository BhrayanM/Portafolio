// Las credenciales de Twilio se leen de process.env directamente (no via config/):
// dotenv ya esta cargado cuando se alcanza este servicio, porque app.js requiere
// ./config antes de montar las rutas.
class VoiceService {
  getAccountSid() {
    return process.env.TWILIO_ACCOUNT_SID;
  }

  getAuthToken() {
    return process.env.TWILIO_AUTH_TOKEN;
  }

  getPhoneNumber() {
    return process.env.TWILIO_PHONE_NUMBER;
  }

  isConfigured() {
    return !!(this.getAccountSid() && this.getAuthToken() && this.getPhoneNumber());
  }

  async makeCall(to, webhookUrl) {
    if (!this.isConfigured()) {
      throw new Error('Voice AI not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER in .env');
    }

    const accountSid = this.getAccountSid();
    const authToken = this.getAuthToken();

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: this.getPhoneNumber(),
          Url: webhookUrl,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twilio API error: ${error}`);
    }

    return response.json();
  }

  parseIncoming(payload) {
    if (!payload) return null;

    return {
      callSid: payload.CallSid,
      from: payload.From,
      to: payload.To,
      digits: payload.Digits || null,
      speechResult: payload.SpeechResult || null,
      callStatus: payload.CallStatus,
    };
  }
}

module.exports = new VoiceService();
