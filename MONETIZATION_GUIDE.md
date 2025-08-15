# 🚀 LinkShort Monetization System Guide

## Overview

Your URL shortener now has a complete monetization system with tiered subscriptions, usage tracking, and Chapa payment integration. This guide covers everything you need to know to get started with monetization.

## 🎯 Subscription Tiers

### Free Tier (Limited)
- **5 links per month**
- Basic analytics (7 days retention)
- No custom domains
- No API access
- Standard support

### Pro Tier (300 ETB/month)
- **100 links per month**
- Advanced analytics (30 days retention)
- Email support
- Link scheduling & QR codes

### Premium Tier (900 ETB/month)
- **Unlimited links**
- Full analytics (1 year retention)
- Priority support
- Team collaboration (up to 3 members)
- White-label options

## 🛠️ Technical Implementation

### Database Schema

The system uses several new tables:

1. **`subscription_plans`** - Stores plan details and pricing
2. **`usage_tracking`** - Tracks monthly usage per user
3. **`billing_history`** - Records payment history
4. **Updated `users` table** - Added subscription fields

### Key Files

- `back-end/src/subscription-utils.ts` - Core subscription logic
- `back-end/src/chapa-integration.ts` - Chapa payment processing
- `front-end/src/app/dashboard/subscription/page.tsx` - Subscription management UI
- `front-end/src/components/usage-warning.tsx` - Usage limit warnings

## 🔧 Setup Instructions

### 1. Environment Variables

Add these to your Cloudflare Workers environment:

```bash
CHAPA_SECRET_KEY=CHASECK_TEST-...  # Your Chapa secret key
CHAPA_PUBLIC_KEY=CHAPUBK_TEST-... # Your Chapa public key
CHAPA_ENCRYPTION_KEY=... # Your Chapa encryption key
```

### 2. Chapa Dashboard Setup

1. **Create Products & Plans**:
   - Go to Chapa Dashboard → Products
   - Create products for "Pro" and "Premium" plans
   - Set up monthly and yearly prices in ETB
   - Configure webhook endpoints

2. **Configure Webhooks**:
   - Go to Chapa Dashboard → Webhooks
   - Add endpoint: `https://your-domain.workers.dev/api/webhooks/chapa`
   - Select these events:
     - `payment_success`
     - `payment_failed`
   - Test webhook delivery

### 3. Update Pricing

The system now uses ETB pricing. Update the subscription plans in the database:

```sql
UPDATE subscription_plans 
SET price_monthly = CASE 
  WHEN tier = 'pro' THEN 30000  -- 300 ETB
  WHEN tier = 'premium' THEN 90000  -- 900 ETB
  ELSE price_monthly
END,
price_yearly = CASE 
  WHEN tier = 'pro' THEN 300000  -- 3000 ETB (save 17%)
  WHEN tier = 'premium' THEN 900000  -- 9000 ETB (save 17%)
  ELSE price_yearly
END
WHERE tier IN ('pro', 'premium');
```

## 🎨 Frontend Features

### Subscription Dashboard (`/dashboard/subscription`)

- **Overview Tab**: Current plan, usage stats, upgrade prompts
- **Plans & Pricing Tab**: Compare all plans with feature lists
- **Usage Tab**: Detailed usage breakdown with progress bars

### Usage Warnings

- **80% Warning**: Orange alert when approaching limits
- **100% Blocking**: Red alert when limits are reached
- **Auto-dismissible**: Users can close warnings
- **Upgrade CTAs**: Direct links to subscription page

### Sidebar Integration

- Subscription link in dashboard sidebar
- Current tier badge on user profile
- Premium feature indicators

## 🔌 API Endpoints

### Subscription Management

```typescript
// Get all subscription plans
GET /api/subscription/plans

// Get current user's subscription
GET /api/subscription/current

// Get usage summary
GET /api/subscription/usage

// Initialize Chapa payment
POST /api/subscription/checkout
Body: { planId: string, billingCycle: 'monthly' | 'yearly', phoneNumber: string }

// Verify transaction
GET /api/subscription/verify/:txRef

// Open billing management
POST /api/subscription/billing-portal

// Chapa webhook
POST /api/webhooks/chapa
```

### Usage Tracking

The system automatically tracks:
- Links created per month
- API requests per month
- Custom domains used
- Analytics events (unlimited)

## 💰 Revenue Optimization

### Pricing Strategy

1. **Free Tier**: Very limited to encourage upgrades
2. **Pro Tier**: Sweet spot for individual users
3. **Premium Tier**: High-value for businesses/teams

### Upgrade Triggers

- **Usage Limits**: Users hit limits and need more
- **Feature Gaps**: Missing features like custom domains
- **Analytics**: Need longer retention periods
- **Team Features**: Collaboration requirements

### Conversion Optimization

1. **Usage Warnings**: Alert users before they hit limits
2. **Feature Comparison**: Clear plan comparison tables
3. **Success Stories**: Show benefits of upgrading
4. **Easy Upgrade**: One-click upgrade process

## 🚀 Deployment Checklist

### Backend
- [ ] Apply database migrations
- [ ] Set environment variables
- [ ] Configure Stripe webhooks
- [ ] Test subscription endpoints
- [ ] Verify usage tracking

### Frontend
- [ ] Deploy subscription pages
- [ ] Test upgrade flow
- [ ] Verify usage warnings
- [ ] Check billing portal access
- [ ] Test responsive design

### Chapa
- [ ] Create products and plans
- [ ] Configure webhook endpoint
- [ ] Test payment flow
- [ ] Set up billing management
- [ ] Configure currency settings

## 📊 Analytics & Monitoring

### Key Metrics to Track

1. **Conversion Rate**: Free → Pro → Premium
2. **Churn Rate**: Subscription cancellations
3. **Usage Patterns**: Which features drive upgrades
4. **Revenue Growth**: Monthly recurring revenue
5. **Customer Lifetime Value**: Average subscription duration

### Monitoring Tools

- **Stripe Dashboard**: Payment analytics
- **Database Queries**: Usage tracking
- **Application Logs**: Error monitoring
- **User Feedback**: Feature requests

## 🔒 Security Considerations

1. **Webhook Verification**: All Stripe webhooks are verified
2. **Usage Limits**: Enforced at API level
3. **Subscription Status**: Checked before allowing actions
4. **Payment Security**: Handled by Stripe
5. **Data Privacy**: GDPR compliant usage tracking

## 🎯 Next Steps

### Immediate
1. Set up Stripe account and products
2. Configure environment variables
3. Test the complete payment flow
4. Monitor initial user behavior

### Short-term
1. Add annual billing discounts
2. Implement referral program
3. Create onboarding flow
4. Add usage analytics dashboard

### Long-term
1. Enterprise tier with custom pricing
2. White-label solutions
3. API rate limiting
4. Advanced team features

## 🆘 Troubleshooting

### Common Issues

1. **Webhook Failures**: Check webhook secret and endpoint URL
2. **Usage Not Tracking**: Verify database migrations applied
3. **Payment Failures**: Check Stripe configuration
4. **Subscription Sync**: Verify webhook event handling

### Support

- Check Stripe logs for payment issues
- Monitor application logs for errors
- Test webhook endpoints manually
- Verify database schema matches migrations

---

## 🎉 Congratulations!

Your URL shortener now has a complete monetization system! Users can upgrade seamlessly, and you can start generating revenue while providing value to your customers.

**Remember**: Start with conservative limits and adjust based on user feedback and usage patterns. The key is finding the right balance between providing value and encouraging upgrades.


