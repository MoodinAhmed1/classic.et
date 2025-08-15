/**
 * Chapa Payment Gateway Integration
 * 
 * This module provides a clean interface for integrating Chapa payments into your application.
 * It handles payment initialization, verification, and webhook processing.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ChapaConfig {
  secretKey: string;
  publicKey: string;
  encryptionKey: string;
}

export interface CreatePaymentParams {
  amount: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  txRef: string;
  callbackUrl: string;
  returnUrl: string;
  title: string;
  description: string;
}

export interface PaymentResponse {
  status: string;
  message: string;
  data?: {
    checkout_url: string;
    tx_ref: string;
    amount: number;
    currency: string;
  };
}

export interface VerificationResponse {
  status: string;
  message: string;
  data?: {
    tx_ref: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
}

export interface WebhookEvent {
  event: string;
  type?: string;
  data?: any;
  status?: string;
  tx_ref?: string;
  reference?: string;
}

// ============================================================================
// CHAPA SERVICE - Core Payment Operations
// ============================================================================

export class ChapaService {
  private secretKey: string;
  private publicKey: string;
  private encryptionKey: string;
  private baseUrl: string;

  constructor(config: ChapaConfig) {
    this.secretKey = config.secretKey;
    this.publicKey = config.publicKey;
    this.encryptionKey = config.encryptionKey;
    this.baseUrl = 'https://api.chapa.co/v1';
  }

  /**
   * Initialize a payment transaction
   * Creates a payment session and returns a checkout URL
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${this.secretKey}`);
    headers.append("Content-Type", "application/json");

    const payload = {
      amount: params.amount.toString(),
      currency: "ETB",
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      phone_number: params.phoneNumber,
      tx_ref: params.txRef,
      callback_url: params.callbackUrl,
      return_url: params.returnUrl,
      "customization[title]": params.title,
      "customization[description]": params.description,
      "meta[hide_receipt]": "false",
      "meta[redirect_delay]": "15"
    };

    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Chapa API error:', response.status, errorText);
        throw new Error(`Chapa API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as PaymentResponse;
      console.log('Chapa payment initialized:', result);
      return result;
    } catch (error) {
      console.error('Chapa payment initialization error:', error);
      throw new Error('Failed to initialize payment');
    }
  }

  /**
   * Verify a transaction status
   * Checks the final status of a payment with Chapa
   */
  async verifyTransaction(txRef: string): Promise<VerificationResponse> {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${this.secretKey}`);

    try {
      const response = await fetch(`${this.baseUrl}/transaction/verify/${txRef}`, {
        method: 'GET',
        headers: headers,
        redirect: 'follow'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Chapa verification error:', response.status, errorText);
        throw new Error(`Verification failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as VerificationResponse;
      console.log('Chapa transaction verified:', result);
      return result;
    } catch (error) {
      console.error('Chapa transaction verification error:', error);
      throw new Error('Failed to verify transaction');
    }
  }

  /**
   * Generate a unique transaction reference
   * Creates a unique identifier for each payment
   */
  generateTxRef(prefix: string = 'TXN'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Encrypt sensitive data (optional security layer)
   * Uses the encryption key to encode sensitive information
   */
  encryptData(data: string): string {
    return btoa(data + this.encryptionKey);
  }

  /**
   * Decrypt sensitive data
   * Reverses the encryption process
   */
  decryptData(encryptedData: string): string {
    try {
      const decoded = atob(encryptedData);
      return decoded.replace(this.encryptionKey, '');
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  }
}

// ============================================================================
// WEBHOOK HANDLER - Process Payment Notifications
// ============================================================================

export class ChapaWebhookHandler {
  constructor(private db: D1Database) {}

  /**
   * Handle successful payment webhook
   * Updates user subscription and marks transaction as successful
   */
  async handlePaymentSuccess(event: WebhookEvent): Promise<void> {
    const data = event?.data || {};
    const txRef = data.tx_ref || data.reference || event.tx_ref || event.reference;
    const status = (data.status || event.status || 'success').toLowerCase();

    if (!txRef) {
      console.error('Webhook success missing tx_ref', event);
      return;
    }

    console.log(`Processing successful payment for tx_ref: ${txRef}`);

    try {
      // Mark payment as successful
      await this.db.prepare(`
        UPDATE payment_transactions 
        SET status = ?, updated_at = ?
        WHERE tx_ref = ?
      `).bind(status, new Date().toISOString(), txRef).run();

      // Load transaction to update user tier
      const transaction = await this.db.prepare(`
        SELECT user_id, plan_id, billing_cycle FROM payment_transactions WHERE tx_ref = ?
      `).bind(txRef).first() as any;

      if (!transaction) {
        console.error('Transaction not found for tx_ref:', txRef);
        return;
      }

      // Update user subscription
      const plan = await this.getSubscriptionPlanById(transaction.plan_id);
      const newTier = plan?.tier || 'pro';

      await this.db.prepare(`
        UPDATE users 
        SET tier = ?, subscription_status = 'active', 
            current_period_start = ?, current_period_end = ?
        WHERE id = ?
      `).bind(
        newTier,
        new Date().toISOString(),
        new Date(Date.now() + (transaction.billing_cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
        transaction.user_id
      ).run();

      console.log(`Payment success processed. User ${transaction.user_id} upgraded to ${newTier}.`);
    } catch (error) {
      console.error('Error processing payment success:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment webhook
   * Marks transaction as failed for tracking
   */
  async handlePaymentFailed(event: WebhookEvent): Promise<void> {
    const data = event?.data || {};
    const txRef = data.tx_ref || data.reference || event.tx_ref || event.reference;
    const reason = data.reason || data.message || 'unknown';

    if (!txRef) {
      console.error('Webhook failure missing tx_ref', event);
      return;
    }

    console.log(`Processing failed payment for tx_ref: ${txRef}, reason: ${reason}`);

    try {
      await this.db.prepare(`
        UPDATE payment_transactions 
        SET status = 'failed', updated_at = ?
        WHERE tx_ref = ?
      `).bind(new Date().toISOString(), txRef).run();

      console.log(`Payment failed marked for tx_ref: ${txRef}`);
    } catch (error) {
      console.error('Error processing payment failure:', error);
      throw error;
    }
  }

  /**
   * Get subscription plan by ID
   * Helper method to resolve plan details
   */
  private async getSubscriptionPlanById(planId: string): Promise<any> {
    const plan = await this.db.prepare(`
      SELECT * FROM subscription_plans WHERE id = ?
    `).bind(planId).first() as any;

    if (!plan) return null;

    return {
      ...plan,
      features: JSON.parse(plan.features),
      limits: JSON.parse(plan.limits)
    };
  }
}
