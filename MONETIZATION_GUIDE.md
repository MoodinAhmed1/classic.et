# 🚀 LinkShort Monetization System Guide

## Overview

Your URL shortener now has a complete monetization system with tiered subscriptions, usage tracking, and Stripe payment integration. This guide covers everything you need to know to get started with monetization.

## 🎯 Subscription Tiers

### Free Tier (Limited)
- **5 links per month**
- Basic analytics (7 days retention)
- No custom domains
- No API access
- Standard support

### Pro Tier ($9.99/month)
- **100 links per month**
- Advanced analytics (30 days retention)
- 1 custom domain
- 1,000 API requests/month
- Email support
- Link scheduling & QR codes

### Pro Extreme ($29.99/month)
- **Unlimited links**
- Full analytics (1 year retention)
- 5 custom domains
- Unlimited API access
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
- `back-end/src/stripe-integration.ts` - Stripe payment processing
- `front-end/src/app/dashboard/subscription/page.tsx` - Subscription management UI
- `front-end/src/components/usage-warning.tsx` - Usage limit warnings

## 🔧 Setup Instructions

### 1. Environment Variables

Add these to your Cloudflare Workers environment:

```bash
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Your Stripe webhook secret
```

### 2. Stripe Dashboard Setup

1. **Create Products & Prices**:
   - Go to Stripe Dashboard → Products
   - Create products for "Pro" and "Pro Extreme" plans
   - Set up monthly and yearly prices
   - Copy the price IDs and update `STRIPE_PRICE_IDS` in `stripe-integration.ts`

2. **Configure Webhooks**:
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://your-domain.workers.dev/api/webhooks/stripe`
   - Select these events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the webhook secret to your environment variables

### 3. Update Price IDs

Edit `back-end/src/stripe-integration.ts` and replace the placeholder price IDs:

```typescript
export const STRIPE_PRICE_IDS = {
  pro: {
    monthly: 'price_1ABC123...', // Your actual Pro monthly price ID
    yearly: 'price_1DEF456...',  // Your actual Pro yearly price ID
  },
  premium: {
    monthly: 'price_1GHI789...', // Your actual Premium monthly price ID
    yearly: 'price_1JKL012...',  // Your actual Premium yearly price ID
  },
} as const;
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

// Create Stripe checkout session
POST /api/subscription/checkout
Body: { planId: string, billingCycle: 'monthly' | 'yearly' }

// Open billing portal
POST /api/subscription/billing-portal

// Stripe webhook
POST /api/webhooks/stripe
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

### Stripe
- [ ] Create products and prices
- [ ] Configure webhook endpoint
- [ ] Test payment flow
- [ ] Set up billing portal
- [ ] Configure tax settings (if applicable)

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


