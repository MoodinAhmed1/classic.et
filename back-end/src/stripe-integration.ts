// Stripe integration for subscription management

import Stripe from 'stripe';

interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
}

interface CreateCheckoutSessionParams {
  planId: string;
  planTier: 'pro' | 'premium';
  priceId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

interface CreateCustomerParams {
  email: string;
  name?: string;
}

export class StripeService {
  private stripe: Stripe;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  // Create a new customer
  async createCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        source: 'linkshort'
      }
    });
  }

  // Create a checkout session for subscription
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      customer_email: params.customerEmail,
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        planId: params.planId,
        planTier: params.planTier,
      },
      subscription_data: {
        metadata: {
          planId: params.planId,
          planTier: params.planTier,
        },
      },
    });
  }

  // Create a billing portal session
  async createBillingPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: string, signature: string, webhookSecret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  // Get subscription details
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<Stripe.Subscription> {
    if (cancelAtPeriodEnd) {
      return this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      return this.stripe.subscriptions.cancel(subscriptionId);
    }
  }

  // Reactivate subscription
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  // Get customer details
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return this.stripe.customers.retrieve(customerId) as Promise<Stripe.Customer>;
  }

  // Update customer
  async updateCustomer(customerId: string, data: Partial<Stripe.CustomerUpdateParams>): Promise<Stripe.Customer> {
    return this.stripe.customers.update(customerId, data);
  }
}

// Price IDs for different plans (you'll need to create these in your Stripe dashboard)
export const STRIPE_PRICE_IDS = {
  pro: {
    monthly: 'price_pro_monthly', // Replace with actual price ID
    yearly: 'price_pro_yearly',   // Replace with actual price ID
  },
  premium: {
    monthly: 'price_premium_monthly', // Replace with actual price ID
    yearly: 'price_premium_yearly',   // Replace with actual price ID
  },
} as const;

// Webhook event handlers
export class WebhookHandler {
  constructor(private db: D1Database) {}

  async handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    
    // Update user subscription in database
    await this.db.prepare(`
      UPDATE users 
      SET tier = ?, subscription_status = 'active', subscription_id = ?, 
          current_period_start = ?, current_period_end = ?, cancel_at_period_end = false
      WHERE email = ?
    `).bind(
      subscription.metadata.planTier,
      subscription.id,
      new Date(subscription.current_period_start * 1000).toISOString(),
      new Date(subscription.current_period_end * 1000).toISOString(),
      subscription.customer_email
    ).run();
  }

  async handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    
    await this.db.prepare(`
      UPDATE users 
      SET tier = ?, subscription_status = ?, 
          current_period_start = ?, current_period_end = ?, cancel_at_period_end = ?
      WHERE subscription_id = ?
    `).bind(
      subscription.metadata.planTier,
      subscription.status,
      new Date(subscription.current_period_start * 1000).toISOString(),
      new Date(subscription.current_period_end * 1000).toISOString(),
      subscription.cancel_at_period_end,
      subscription.id
    ).run();
  }

  async handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    
    // Downgrade user to free tier
    await this.db.prepare(`
      UPDATE users 
      SET tier = 'free', subscription_status = 'canceled', 
          subscription_id = NULL, current_period_start = NULL, 
          current_period_end = NULL, cancel_at_period_end = false
      WHERE subscription_id = ?
    `).bind(subscription.id).run();
  }

  async handleInvoicePaymentSucceeded(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    
    // Record successful payment
    await this.db.prepare(`
      INSERT INTO billing_history (id, user_id, subscription_id, amount, currency, status, billing_period_start, billing_period_end)
      SELECT ?, u.id, ?, ?, ?, 'succeeded', ?, ?
      FROM users u WHERE u.subscription_id = ?
    `).bind(
      crypto.randomUUID(),
      invoice.subscription,
      invoice.amount_paid,
      invoice.currency,
      new Date(invoice.period_start * 1000).toISOString(),
      new Date(invoice.period_end * 1000).toISOString(),
      invoice.subscription
    ).run();
  }

  async handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    
    // Update subscription status to past_due
    await this.db.prepare(`
      UPDATE users 
      SET subscription_status = 'past_due'
      WHERE subscription_id = ?
    `).bind(invoice.subscription).run();
  }
}


