# Chapa Payment Integration - Quick Start

## 🚀 Get Started in 5 Minutes

### 1. **Setup Chapa Account**
- Sign up at [chapa.co](https://chapa.co)
- Go to **Settings → API Keys**
- Copy your TEST keys (you'll see `CHASECK_TEST-` and `CHAPUBK_TEST-`)

### 2. **Configure Environment**
```bash
# Add these to your .env or wrangler.toml
CHAPA_SECRET_KEY=CHASECK_TEST-your_key_here
CHAPA_PUBLIC_KEY=CHAPUBK_TEST-your_key_here
CHAPA_ENCRYPTION_KEY=any_random_string
CHAPA_WEBHOOK_SECRET=your_webhook_secret
FRONTEND_URL=http://localhost:3000
```

### 3. **Set Webhook in Chapa Dashboard**
- Go to **Settings → Webhooks**
- URL: `https://yourdomain.com/api/webhooks/chapa`
- Secret Hash: Same as `CHAPA_WEBHOOK_SECRET`

### 4. **Test Payment Flow**
1. **Start checkout** in your app
2. **Enter test phone**: `0900123456` (or any from the list below)
3. **Complete payment** on Chapa's hosted page
4. **Verify webhook** received and user upgraded

## 📱 Test Credentials

### Test Phone Numbers (Success)
```
Awash Bank: 0900123456, 0900112233, 0900881111
Amole: 0900123456, 0900112233, 0900881111
Telebirr: 0900123456, 0900112233, 0900881111
M-Pesa: 0700123456, 0700112233, 0700881111
OTP: 12345 (for all numbers)
```

### Test Cards (Success)
```
Visa: 4200 0000 0000 0000, CVV: 123, Exp: 12/34
Mastercard: 5400 0000 0000 0000, CVV: 123, Exp: 12/34
Amex: 3700 0000 0000 0000, CVV: 1234, Exp: 12/34
```

## 🔧 Key Endpoints

### Frontend
- **POST** `/api/subscription/checkout` - Start payment
- **GET** `/api/subscription/verify/:txRef` - Verify payment

### Backend (Webhooks)
- **POST** `/api/webhooks/chapa` - Receive payment notifications
- **GET** `/api/webhooks/chapa` - Handle redirects with status

## 💡 How It Works

1. **User clicks upgrade** → Your app calls checkout endpoint
2. **Backend creates payment** → Calls Chapa API, stores transaction
3. **User redirected** → To Chapa's hosted checkout page
4. **Payment completed** → Chapa sends webhook + redirects user
5. **Subscription updated** → User tier upgraded automatically

## 🚨 Common Issues

### Payment Shows "Failed/Canceled"
- **Use exact test phone numbers** from the list above
- **Don't refresh** the checkout page
- **Complete the full flow** without interruption

### Webhook Not Received
- Check webhook URL in Chapa dashboard
- Verify `CHAPA_WEBHOOK_SECRET` matches
- Ensure endpoint is accessible from internet

### User Not Upgraded
- Check webhook logs for errors
- Verify transaction exists in database
- Confirm plan_id matches subscription_plans

## 📚 Next Steps

- Read the full [Chapa Integration Guide](./CHAPA_INTEGRATION_GUIDE.md)
- Check [Chapa Official Docs](https://developer.chapa.co/)
- Test thoroughly before going live
- Complete compliance docs for live mode

## 🆘 Need Help?

- **This Guide**: Check troubleshooting section
- **Chapa Support**: support@chapa.co
- **Official Docs**: [developer.chapa.co](https://developer.chapa.co/)

---

**Remember**: Test mode is your friend! Use it to validate everything before going live. 🎯
