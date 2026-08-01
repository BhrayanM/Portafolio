const billingService = require('../services/billing.service');

const createCheckout = async (req, res, next) => {
  try {
    const { plan } = req.body;
    const successUrl = `${req.headers.origin}/dashboard/billing?success=true`;
    const cancelUrl = `${req.headers.origin}/dashboard/billing?canceled=true`;
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
    res.status(400).json({ error: { message: error.message } });
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
