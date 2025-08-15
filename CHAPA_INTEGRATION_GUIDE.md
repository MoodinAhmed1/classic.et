# Chapa Payment Gateway Integration Guide

## Table of Contents
1. [What is Chapa?](#what-is-chapa)
2. [How Chapa Works](#how-chapa-works)
3. [Integration Architecture](#integration-architecture)
4. [Setup & Configuration](#setup--configuration)
5. [Payment Flow](#payment-flow)
6. [Webhook Handling](#webhook-handling)
7. [Security & Verification](#security--verification)
8. [Testing](#testing)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

## What is Chapa?

**Chapa** is a payment gateway that allows businesses to accept payments from customers in Ethiopia and other African countries. It supports multiple payment methods including:

- **Mobile Money**: Telebirr, Amole, M-Pesa, CBEBirr, COOPPay
- **Bank Transfers**: Direct bank account transfers
- **Card Payments**: International and local card processing
- **Cash Collections**: Physical cash pickup points

### Key Features
- **Multi-currency support** (primarily ETB - Ethiopian Birr)
- **Real-time notifications** via webhooks
- **Hosted checkout pages** for security
- **Test mode** for development and testing
- **Comprehensive API** for integration

## How Chapa Works

### 1. **Test Mode vs Live Mode**
- **Test Mode**: Simulates payments without real money
  - Uses test API keys (prefixed with `TEST`)
  - Requires specific test phone numbers/cards
  - Perfect for development and testing
- **Live Mode**: Processes real payments
  - Uses live API keys
  - Requires compliance documentation approval
  - Handles actual financial transactions

### 2. **Payment Flow Overview**
```
Customer → Your App → Chapa API → Chapa Checkout → Payment Method → Success/Failure → Webhook + Redirect
```

## Integration Architecture

### Components
1. **ChapaService**: Handles payment initialization and verification
2. **ChapaWebhookHandler**: Processes payment notifications
3. **Frontend Integration**: User interface for payment initiation
4. **Backend Routes**: API endpoints for checkout and webhooks
5. **Database**: Stores transaction records and user subscriptions

### File Structure
```
src/
├── chapa-integration.ts          # Core Chapa service classes
├── index.ts                     # Backend routes and webhook handlers
└── subscription-utils.ts        # Subscription management utilities

frontend/
└── subscription/
    └── page.tsx                 # Payment UI and flow
```

## Setup & Configuration

### 1. **Chapa Dashboard Setup**
1. Create account at [chapa.co](https://chapa.co)
2. Navigate to **Settings → API Keys**
3. Copy your API keys:
   - **Secret Key**: `CHASECK_TEST-xxxxxxxxxxxxx` (for backend)
   - **Public Key**: `CHAPUBK_TEST-xxxxxxxxxxxxx` (for frontend)
4. Go to **Settings → Webhooks**
5. Add webhook URL: `https://yourdomain.com/api/webhooks/chapa`
6. Set a **Secret Hash** (e.g., `your_secure_secret_123`)

### 2. **Environment Variables**
```bash
# Required for backend
CHAPA_SECRET_KEY=CHASECK_TEST-xxxxxxxxxxxxx
CHAPA_PUBLIC_KEY=CHAPUBK_TEST-xxxxxxxxxxxxx
CHAPA_ENCRYPTION_KEY=your_encryption_key
CHAPA_WEBHOOK_SECRET=your_webhook_secret

# Optional
FRONTEND_URL=https://yourdomain.com
```

### 3. **Database Schema**
```sql
-- Payment transactions table
CREATE TABLE payment_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  tx_ref TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'ETB',
  billing_cycle TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subscription plans table
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL,
  price_monthly INTEGER NOT NULL,
  price_yearly INTEGER NOT NULL,
  features TEXT NOT NULL,
  limits TEXT NOT NULL
);
```

## Payment Flow

### 1. **Payment Initialization**
```typescript
// Frontend: User selects plan and enters phone number
const handlePayment = async () => {
  const response = await subscriptionApi.initializePayment({
    planId: selectedPlan,
    billingCycle: selectedBillingCycle,
    phoneNumber: phoneNumber,
  });
  
  // Redirect to Chapa checkout
  window.location.href = response.url;
};
```

**What happens:**
1. Frontend sends payment request to backend
2. Backend creates ChapaService instance
3. Generates unique `tx_ref` (transaction reference)
4. Calls Chapa API: `POST /transaction/initialize`
5. Stores transaction in database with `pending` status
6. Returns checkout URL to frontend
7. User is redirected to Chapa's hosted checkout page

### 2. **Chapa Checkout Process**
```
User → Chapa Checkout Page → Select Payment Method → Enter Details → Complete Payment
```

**Payment Methods Available:**
- **Mobile Money**: Enter phone number, receive OTP
- **Bank Transfer**: Select bank, enter account details
- **Card Payment**: Enter card number, CVV, expiry

### 3. **Payment Completion**
After successful payment, Chapa:
1. **Redirects** user back to your `return_url`
2. **Sends webhook** to your `callback_url`
3. **Updates transaction status** in their system

## Webhook Handling

### 1. **Webhook Endpoint**
```typescript
// POST /api/webhooks/chapa
app.post('/api/webhooks/chapa', async (c) => {
  // Verify webhook signature
  // Process payment event
  // Update user subscription
});
```

### 2. **Webhook Events**
```json
{
  "event": "charge.success",
  "type": "API",
  "status": "success",
  "tx_ref": "TXN_1234567890_abc123",
  "amount": "300.00",
  "currency": "ETB"
}
```

### 3. **Signature Verification**
Chapa sends two signature headers for security:
- **`Chapa-Signature`**: HMAC-SHA256 of secret signed with secret
- **`x-chapa-signature`**: HMAC-SHA256 of payload signed with secret

**Verification Process:**
```typescript
const computedBody = crypto.createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex');

const computedSecret = crypto.createHmac('sha256', secret)
  .update(secret)
  .digest('hex');

// Accept if either signature matches
if (signature !== computedBody && signature !== computedSecret) {
  return error('Invalid signature');
}
```

### 4. **Callback URL Support**
Chapa also sends GET requests to your callback URL with query parameters:
```
GET /api/webhooks/chapa?status=success&tx_ref=TXN_123&ref_id=ABC_456
```

## Security & Verification

### 1. **API Key Security**
- **Secret Key**: Never expose in frontend code
- **Public Key**: Safe to use in frontend (limited permissions)
- **Webhook Secret**: Store securely, verify all incoming requests

### 2. **Transaction Verification**
Always verify payments server-side:
```typescript
const verification = await chapaService.verifyTransaction(txRef);
if (verification.data.status === 'success') {
  // Update user subscription
  // Mark transaction as successful
}
```

### 3. **Webhook Security**
- Verify signature headers
- Use HTTPS endpoints
- Implement rate limiting
- Log all webhook attempts

## Testing

### 1. **Test Mode Setup**
- Ensure you're using TEST API keys
- Set webhook URL to your test environment
- Use test phone numbers and cards

### 2. **Test Phone Numbers**
```
Awash Bank: 0900123456, 0900112233, 0900881111
Amole: 0900123456, 0900112233, 0900881111
Telebirr: 0900123456, 0900112233, 0900881111
M-Pesa: 0700123456, 0700112233, 0700881111
OTP: 12345 (for all test numbers)
```

### 3. **Test Card Numbers**
```
Visa: 4200 0000 0000 0000, CVV: 123, Exp: 12/34
Mastercard: 5400 0000 0000 0000, CVV: 123, Exp: 12/34
Amex: 3700 0000 0000 0000, CVV: 1234, Exp: 12/34
```

### 4. **Testing Checklist**
- [ ] Payment initialization succeeds
- [ ] User redirected to Chapa checkout
- [ ] Test payment completes successfully
- [ ] Webhook received and processed
- [ ] User subscription updated
- [ ] Transaction status updated in database

## Production Deployment

### 1. **Switch to Live Mode**
1. Complete compliance documentation in Chapa dashboard
2. Switch from TEST to LIVE mode
3. Update API keys in your environment
4. Update webhook URL to production domain
5. Test with small amounts first

### 2. **Production Checklist**
- [ ] Use LIVE API keys
- [ ] HTTPS endpoints only
- [ ] Webhook signature verification enabled
- [ ] Error logging and monitoring
- [ ] Database backup strategy
- [ ] Rate limiting implemented

### 3. **Monitoring & Alerts**
- Monitor webhook delivery success rates
- Track failed payment attempts
- Set up alerts for unusual activity
- Monitor transaction success rates

## Troubleshooting

### Common Issues

#### 1. **Payment Initialization Fails**
**Symptoms**: 401/400 errors from Chapa API
**Causes**:
- Invalid API key
- Missing required parameters
- Wrong currency (must be ETB)
- Invalid amount format

**Solutions**:
- Verify API key is correct
- Check all required parameters are present
- Ensure amount is a positive number
- Confirm currency is "ETB"

#### 2. **Webhook Not Received**
**Symptoms**: No webhook events in logs
**Causes**:
- Incorrect webhook URL
- Webhook disabled in dashboard
- Network/firewall blocking requests
- Invalid webhook secret

**Solutions**:
- Verify webhook URL in Chapa dashboard
- Check webhook is enabled
- Test webhook endpoint accessibility
- Verify webhook secret matches

#### 3. **Payment Shows as Failed/Canceled**
**Symptoms**: Transaction appears failed in Chapa dashboard
**Causes**:
- Using wrong test credentials
- Payment abandoned mid-flow
- Invalid phone number format
- Test mode disabled

**Solutions**:
- Use exact test phone numbers from docs
- Complete payment flow without interruption
- Ensure phone format: 09xxxxxxxx or 07xxxxxxxx
- Confirm test mode is enabled

#### 4. **User Subscription Not Updated**
**Symptoms**: Payment successful but user tier unchanged
**Causes**:
- Webhook not processed
- Database transaction failed
- Wrong plan_id in transaction record
- User not found

**Solutions**:
- Check webhook logs for errors
- Verify database connection
- Confirm plan_id matches subscription_plans table
- Check user exists in users table

### Debug Steps

1. **Enable Detailed Logging**
```typescript
console.log('Payment request:', { planId, billingCycle, phoneNumber });
console.log('Chapa response:', response);
console.log('Webhook received:', event);
```

2. **Check Network Tab**
- Monitor API calls to Chapa
- Verify webhook requests to your endpoint
- Check response status codes

3. **Database Queries**
```sql
-- Check payment transactions
SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 5;

-- Check user subscriptions
SELECT * FROM users WHERE id = 'user_id_here';

-- Check subscription plans
SELECT * FROM subscription_plans;
```

4. **Chapa Dashboard**
- Verify transaction status
- Check webhook delivery history
- Confirm API key permissions

## Best Practices

### 1. **Error Handling**
- Always handle API failures gracefully
- Implement retry logic for webhooks
- Log errors with context
- Provide user-friendly error messages

### 2. **Security**
- Never log sensitive data
- Validate all input parameters
- Use HTTPS everywhere
- Implement rate limiting

### 3. **User Experience**
- Show loading states during payment
- Provide clear success/failure feedback
- Handle edge cases gracefully
- Offer payment retry options

### 4. **Monitoring**
- Track payment success rates
- Monitor webhook delivery
- Alert on unusual patterns
- Regular security audits

## Resources

- [Chapa Official Documentation](https://developer.chapa.co/)
- [API Reference](https://developer.chapa.co/reference)
- [Test Mode Guide](https://developer.chapa.co/integrations/test-mode-vs-live-mode)
- [Webhook Documentation](https://developer.chapa.co/integrations/webhooks)
- [Error Codes](https://developer.chapa.co/reference/error-codes)

## Support

- **Chapa Support**: support@chapa.co
- **Technical Issues**: Check error logs and webhook delivery
- **Compliance**: Contact Chapa for live mode approval
- **Integration Help**: Review this guide and official docs

---

**Remember**: Always test thoroughly in test mode before going live. Test mode is your friend - use it to validate every aspect of your integration!
