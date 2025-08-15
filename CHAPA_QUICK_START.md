# Chapa Payment Integration - Quick Start Guide

## Overview
This guide explains how to integrate Chapa payment gateway into your URL shortener application for subscription payments.

## Setup

### 1. Environment Variables
Add these to your `.env` file:
```bash
CHAPA_SECRET_KEY=your_secret_key_here
CHAPA_PUBLIC_KEY=your_public_key_here
CHAPA_ENCRYPTION_KEY=your_encryption_key_here
CHAPA_WEBHOOK_SECRET=your_webhook_secret_here
```

### 2. Database Tables
Ensure you have the required database tables for payment tracking and subscriptions.

## Payment Flow

### 1. Initialize Payment
```typescript
const chapaService = new ChapaService({
  secretKey: process.env.CHAPA_SECRET_KEY,
  publicKey: process.env.CHAPA_PUBLIC_KEY,
  encryptionKey: process.env.CHAPA_ENCRYPTION_KEY,
});

const payment = await chapaService.createPayment({
  amount: 900, // Amount in ETB
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  phoneNumber: "+251912345678",
  txRef: "PLAN_PRO_1234567890",
  callbackUrl: "https://yourapp.com/api/webhooks/chapa",
  returnUrl: "https://yourapp.com/dashboard/subscription/receipt?tx_ref=PLAN_PRO_1234567890",
  title: "Pro Plan Subscription",
  description: "Pro plan subscription for monthly billing cycle"
});
```

### 2. Handle Payment Completion
After successful payment, Chapa will redirect users to your receipt page where they can:
- View payment confirmation
- See transaction details
- Wait 15 seconds before automatic redirect
- Manually navigate using provided buttons

## Important Notes

### Receipt Display
- **Receipt Page**: Users are redirected to `/dashboard/subscription/receipt` after payment
- **15-Second Delay**: Users have 15 seconds to read the receipt before automatic redirect
- **Manual Navigation**: Users can click "Go Home" or "Continue" buttons anytime
- **No Auto-Redirect**: Chapa receipt page stays visible until user action or timeout

### Test Mode
- Use test phone numbers for development
- Test transactions show "Test Mode: Not a real payment" on receipt
- Test phone numbers:
  - Awash Bank: 0900123456, 0900112233, 0900881111

### Production Considerations
- Ensure webhook endpoints are secure
- Handle payment verification properly
- Monitor transaction status updates
- Implement proper error handling

## Troubleshooting

### Common Issues
1. **Receipt Redirects Too Fast**: Ensure `meta[redirect_delay]` is set to "15" or higher
2. **Payment Verification Fails**: Check webhook configuration and database connections
3. **Test Mode Issues**: Verify you're using test phone numbers and test environment

### Support
For Chapa-specific issues, contact Chapa support at:
- Phone: +251-960724272
- Email: info@chapa.co
- Website: chapa.co
