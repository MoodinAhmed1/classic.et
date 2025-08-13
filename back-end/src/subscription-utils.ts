// Subscription and usage tracking utilities

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'free' | 'pro' | 'premium';
  price_monthly: number;
  price_yearly: number;
  features: string[];
  limits: {
    links_per_month: number;
    api_requests_per_month: number;
    custom_domains: number;
    analytics_retention_days: number;
    team_members: number;
  };
}

export interface UsageTracking {
  id: string;
  user_id: string;
  month: string;
  links_created: number;
  api_requests: number;
  custom_domains_used: number;
  analytics_events: number;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'premium';
  subscription_status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  subscription_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

// Get current month in YYYY-MM format
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get subscription plan by tier
export async function getSubscriptionPlan(db: D1Database, tier: string): Promise<SubscriptionPlan | null> {
  const plan = await db.prepare(`
    SELECT * FROM subscription_plans WHERE tier = ?
  `).bind(tier).first() as any;
  
  if (!plan) return null;
  
  return {
    ...plan,
    features: JSON.parse(plan.features),
    limits: JSON.parse(plan.limits)
  };
}

// Get or create usage tracking for current month
export async function getOrCreateUsageTracking(db: D1Database, userId: string): Promise<UsageTracking> {
  const currentMonth = getCurrentMonth();
  
  // Try to get existing usage
  let usage = await db.prepare(`
    SELECT * FROM usage_tracking WHERE user_id = ? AND month = ?
  `).bind(userId, currentMonth).first() as any;
  
  if (!usage) {
    // Create new usage record
    const usageId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO usage_tracking (id, user_id, month, links_created, api_requests, custom_domains_used, analytics_events)
      VALUES (?, ?, ?, 0, 0, 0, 0)
    `).bind(usageId, userId, currentMonth).run();
    
    usage = {
      id: usageId,
      user_id: userId,
      month: currentMonth,
      links_created: 0,
      api_requests: 0,
      custom_domains_used: 0,
      analytics_events: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  return usage;
}

// Check if user can perform an action based on their tier and usage
export async function checkUsageLimit(
  db: D1Database, 
  userId: string, 
  action: 'create_link' | 'api_request' | 'custom_domain' | 'analytics'
): Promise<{ allowed: boolean; current: number; limit: number; message?: string }> {
  // Get user and their subscription plan
  const user = await db.prepare(`
    SELECT * FROM users WHERE id = ?
  `).bind(userId).first() as any;
  
  if (!user) {
    return { allowed: false, current: 0, limit: 0, message: 'User not found' };
  }
  
  const plan = await getSubscriptionPlan(db, user.tier);
  if (!plan) {
    return { allowed: false, current: 0, limit: 0, message: 'Invalid subscription plan' };
  }
  
  // Check subscription status
  if (user.subscription_status !== 'active' && user.tier !== 'free') {
    return { allowed: false, current: 0, limit: 0, message: 'Subscription not active' };
  }
  
  // Get current usage
  const usage = await getOrCreateUsageTracking(db, userId);
  
  let current: number;
  let limit: number;
  
  switch (action) {
    case 'create_link':
      current = usage.links_created;
      limit = plan.limits.links_per_month;
      break;
    case 'api_request':
      current = usage.api_requests;
      limit = plan.limits.api_requests_per_month;
      break;
    case 'custom_domain':
      current = usage.custom_domains_used;
      limit = plan.limits.custom_domains;
      break;
    case 'analytics':
      current = usage.analytics_events;
      limit = -1; // Analytics events are unlimited for all tiers
      break;
    default:
      return { allowed: false, current: 0, limit: 0, message: 'Invalid action' };
  }
  
  // Unlimited (-1) means no limit
  const allowed = limit === -1 || current < limit;
  
  return { allowed, current, limit };
}

// Increment usage for an action
export async function incrementUsage(
  db: D1Database, 
  userId: string, 
  action: 'create_link' | 'api_request' | 'custom_domain' | 'analytics'
): Promise<void> {
  const currentMonth = getCurrentMonth();
  
  let column: string;
  switch (action) {
    case 'create_link':
      column = 'links_created';
      break;
    case 'api_request':
      column = 'api_requests';
      break;
    case 'custom_domain':
      column = 'custom_domains_used';
      break;
    case 'analytics':
      column = 'analytics_events';
      break;
    default:
      throw new Error('Invalid action');
  }
  
  await db.prepare(`
    UPDATE usage_tracking 
    SET ${column} = ${column} + 1, updated_at = ?
    WHERE user_id = ? AND month = ?
  `).bind(new Date().toISOString(), userId, currentMonth).run();
}

// Get user's usage summary
export async function getUserUsageSummary(db: D1Database, userId: string): Promise<{
  current: UsageTracking;
  plan: SubscriptionPlan;
  limits: {
    links: { current: number; limit: number; percentage: number };
    api: { current: number; limit: number; percentage: number };
    domains: { current: number; limit: number; percentage: number };
  };
}> {
  const user = await db.prepare(`
    SELECT * FROM users WHERE id = ?
  `).bind(userId).first() as any;
  
  const plan = await getSubscriptionPlan(db, user.tier);
  const usage = await getOrCreateUsageTracking(db, userId);
  
  if (!plan) {
    throw new Error('Invalid subscription plan');
  }
  
  const calculatePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.round((current / limit) * 100);
  };
  
  return {
    current: usage,
    plan,
    limits: {
      links: {
        current: usage.links_created,
        limit: plan.limits.links_per_month,
        percentage: calculatePercentage(usage.links_created, plan.limits.links_per_month)
      },
      api: {
        current: usage.api_requests,
        limit: plan.limits.api_requests_per_month,
        percentage: calculatePercentage(usage.api_requests, plan.limits.api_requests_per_month)
      },
      domains: {
        current: usage.custom_domains_used,
        limit: plan.limits.custom_domains,
        percentage: calculatePercentage(usage.custom_domains_used, plan.limits.custom_domains)
      }
    }
  };
}

// Check if user has access to a specific feature
export function hasFeatureAccess(plan: SubscriptionPlan, feature: string): boolean {
  return plan.features.includes(feature);
}

// Get analytics retention days for user's tier
export async function getAnalyticsRetentionDays(db: D1Database, userId: string): Promise<number> {
  const user = await db.prepare(`
    SELECT tier FROM users WHERE id = ?
  `).bind(userId).first() as any;
  
  const plan = await getSubscriptionPlan(db, user.tier);
  return plan?.limits.analytics_retention_days || 7;
}
