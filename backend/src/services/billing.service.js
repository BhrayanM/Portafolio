const { pool } = require('../db');
const { NotFoundError } = require('../utils/errors');
const { logger } = require('../utils/logger');

let _stripe = null;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY no configurada');
    }
    _stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

const PLANS = {
  starter: { priceId: 'price_starter_monthly', name: 'Starter', amount: 4900, currency: 'usd' },
  growth: { priceId: 'price_growth_monthly', name: 'Growth', amount: 14900, currency: 'usd' },
  enterprise: { priceId: 'price_enterprise_monthly', name: 'Enterprise', amount: 49900, currency: 'usd' },
};

class BillingService {
  async createCheckoutSession(tenantId, planSlug, successUrl, cancelUrl) {
    const plan = PLANS[planSlug];
    if (!plan) throw new NotFoundError('Plan no encontrado');

    const tenant = await pool.query('SELECT id, name, stripe_customer_id FROM tenants WHERE id = $1', [tenantId]);
    if (tenant.rows.length === 0) throw new NotFoundError('Tenant no encontrado');

    let customerId = tenant.rows[0].stripe_customer_id;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        metadata: { tenant_id: tenantId },
        name: tenant.rows[0].name,
      });
      customerId = customer.id;
      await pool.query('UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2', [customerId, tenantId]);
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { tenant_id: tenantId, plan: planSlug },
    });

    return { url: session.url, sessionId: session.id };
  }

  async handleWebhook(event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.metadata.tenant_id;
        const plan = session.metadata.plan;

        await pool.query(
          `UPDATE tenants SET plan = $1, status = 'active', stripe_subscription_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [plan, session.subscription, tenantId]
        );

        logger.info('Tenant subscribed', { tenantId, plan });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const status = subscription.status === 'active' ? 'active' : 'past_due';

        await pool.query(
          'UPDATE tenants SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = $2',
          [status, subscription.id]
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await pool.query(
          `UPDATE tenants SET plan = 'starter', status = 'inactive', stripe_subscription_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = $1`,
          [subscription.id]
        );
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        await pool.query(
          'UPDATE tenants SET status = $1 WHERE stripe_customer_id = $2',
          ['past_due', customerId]
        );
        break;
      }
    }
  }

  async getSubscription(tenantId) {
    const result = await pool.query(
      'SELECT plan, status, stripe_subscription_id FROM tenants WHERE id = $1',
      [tenantId]
    );
    if (result.rows.length === 0) throw new NotFoundError('Tenant no encontrado');
    return result.rows[0];
  }

  async getPlans() {
    return Object.entries(PLANS).map(([slug, plan]) => ({
      slug,
      name: plan.name,
      amount: plan.amount,
      currency: plan.currency,
    }));
  }

  constructEvent(payload, signature) {
    return getStripe().webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET || '');
  }
}

module.exports = new BillingService();