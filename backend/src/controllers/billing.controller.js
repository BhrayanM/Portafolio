const billingService = require('../services/billing.service');
const config = require('../config');

/**
 * Base para las URLs de retorno de Stripe Checkout.
 *
 * Antes se usaba `req.headers.origin` tal cual. `Origin` lo controla el cliente, asi
 * que se podia conseguir que Stripe redirigiese al dominio del atacante despues de
 * pagar (phishing con pinta legitima). Ahora el origen solo se acepta si esta en la
 * lista blanca de CORS; si no, se cae al primer origen configurado.
 */
const resolveReturnBase = (req) => {
  const origin = req.headers.origin;
  if (origin && config.corsOrigins.includes(origin)) return origin;
  return config.corsOrigins[0];
};

const createCheckout = async (req, res, next) => {
  try {
    const { plan } = req.body;
    const base = resolveReturnBase(req);
    const successUrl = `${base}/dashboard/billing?success=true`;
    const cancelUrl = `${base}/dashboard/billing?canceled=true`;
    const result = await billingService.createCheckoutSession(req.tenantId, plan, successUrl, cancelUrl);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const handleWebhook = async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = billingService.constructEvent(req.body, sig);
    await billingService.handleWebhook(event);
    res.json({ received: true });
  } catch (error) {
    // Antes devolvia `error.message` crudo, que expone detalles internos de
    // la libreria de Stripe, y ademas se saltaba el handler central. Ahora pasa por
    // el handler, que ya decide que se puede contar y que solo va al log.
    next(error);
  }
};

const getSubscription = async (req, res, next) => {
  try {
    const subscription = await billingService.getSubscription(req.tenantId);
    res.json(subscription);
  } catch (error) {
    next(error);
  }
};

const getPlans = async (req, res) => {
  const plans = await billingService.getPlans();
  res.json(plans);
};

module.exports = { createCheckout, handleWebhook, getSubscription, getPlans };
