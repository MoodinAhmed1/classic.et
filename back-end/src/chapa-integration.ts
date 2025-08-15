// Chapa payment integration for subscription management

interface ChapaConfig {
  secretKey: string;
  publicKey: string;
  encryptionKey: string;
}

interface CreatePaymentParams {
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

interface PaymentResponse {
  status: string;
  message: string;
  data?: {
    checkout_url: string;
    tx_ref: string;
    amount: number;
    currency: string;
  };
}

interface VerificationResponse {
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

  // Initialize a payment
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${this.secretKey}`);
    headers.append("Content-Type", "application/json");

    const raw = JSON.stringify({
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
      "meta[hide_receipt]": "true"
    });

    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: headers,
        body: raw,
      });

      const result = await response.json() as PaymentResponse;
      return result;
    } catch (error) {
      console.error('Chapa payment initialization error:', error);
      throw new Error('Failed to initialize payment');
    }
  }

  // Verify a transaction
  async verifyTransaction(txRef: string): Promise<VerificationResponse> {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${this.secretKey}`);

    try {
      const response = await fetch(`${this.baseUrl}/transaction/verify/${txRef}`, {
        method: 'GET',
        headers: headers,
        redirect: 'follow'
      });

      const result = await response.json() as VerificationResponse;
      return result;
    } catch (error) {
      console.error('Chapa transaction verification error:', error);
      throw new Error('Failed to verify transaction');
    }
  }

  // Generate a unique transaction reference
  generateTxRef(prefix: string = 'TXN'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}_${timestamp}_${random}`;
  }

  // Encrypt sensitive data (optional, for additional security)
  encryptData(data: string): string {
    // Simple encryption using the encryption key
    // In production, you might want to use a more robust encryption method
    return btoa(data + this.encryptionKey);
  }

  // Decrypt sensitive data
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

// Webhook event handlers for Chapa
export class ChapaWebhookHandler {
  constructor(private db: D1Database) {}

  async handlePaymentSuccess(event: any): Promise<void> {
    const { tx_ref, amount, currency, email } = event.data;
    
    // Update user subscription in database
    // This will depend on your subscription logic
    console.log(`Payment successful for tx_ref: ${tx_ref}`);
  }

  async handlePaymentFailed(event: any): Promise<void> {
    const { tx_ref, reason } = event.data;
    
    // Handle failed payment
    console.log(`Payment failed for tx_ref: ${tx_ref}, reason: ${reason}`);
  }
}
