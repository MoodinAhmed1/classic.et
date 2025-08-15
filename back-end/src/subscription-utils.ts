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
    analytics_retention_days: number;
    team_members: number;
  };
  visitor_cap: number | null; // null means unlimited
  has_full_analytics: boolean;
  has_advanced_charts: boolean;
  has_pdf_download: boolean;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  month: string;
  links_created: number;
  analytics_events: number;
  created_at: string;
  updated_at: string;
}

export interface VisitorTracking {
  id: string;
  user_id: string;
  month: string;
  total_visitors: number;
  created_at: string;
  updated_at: string;
}

export interface LastVisitTracking {
  id: string;
  user_id: string;
  last_visit_at: string;
  new_visitors_since_last_visit: number;
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

// Get subscription plan by ID (for checkout flow)
export async function getSubscriptionPlanById(db: D1Database, id: string): Promise<SubscriptionPlan | null> {
  const plan = await db.prepare(`
    SELECT * FROM subscription_plans WHERE id = ?
  `).bind(id).first() as any;

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
      INSERT INTO usage_tracking (id, user_id, month, links_created, analytics_events)
      VALUES (?, ?, ?, 0, 0)
    `).bind(usageId, userId, currentMonth).run();
    
    usage = {
      id: usageId,
      user_id: userId,
      month: currentMonth,
      links_created: 0,
      analytics_events: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  return usage;
}

// Get or create visitor tracking for current month
export async function getOrCreateVisitorTracking(db: D1Database, userId: string): Promise<VisitorTracking> {
  const currentMonth = getCurrentMonth();
  
  // Try to get existing visitor tracking
  let visitorTracking = await db.prepare(`
    SELECT * FROM visitor_tracking WHERE user_id = ? AND month = ?
  `).bind(userId, currentMonth).first() as any;
  
  if (!visitorTracking) {
    // Create new visitor tracking record
    const trackingId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO visitor_tracking (id, user_id, month, total_visitors)
      VALUES (?, ?, ?, 0)
    `).bind(trackingId, userId, currentMonth).run();
    
    visitorTracking = {
      id: trackingId,
      user_id: userId,
      month: currentMonth,
      total_visitors: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  return visitorTracking;
}

// Check if user can perform an action based on their tier and usage
export async function checkUsageLimit(
  db: D1Database, 
  userId: string, 
  action: 'create_link' | 'analytics' | 'visitor_tracking'
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
    case 'analytics':
      current = usage.analytics_events;
      limit = -1; // Analytics events are unlimited for all tiers
      break;
    case 'visitor_tracking':
      const visitorTracking = await getOrCreateVisitorTracking(db, userId);
      current = visitorTracking.total_visitors;
      limit = plan.visitor_cap || -1; // null means unlimited
      break;
    default:
      return { allowed: false, current: 0, limit: 0, message: 'Invalid action' };
  }
  
  // Unlimited (-1) means no limit
  const allowed = limit === -1 || current < limit;
  
  return { allowed, current, limit };
}

// Check visitor cap specifically
export async function checkVisitorCap(db: D1Database, userId: string): Promise<{ allowed: boolean; current: number; limit: number | null }> {
  const result = await checkUsageLimit(db, userId, 'visitor_tracking');
  return {
    allowed: result.allowed,
    current: result.current,
    limit: result.limit === -1 ? null : result.limit
  };
}

// Increment usage for an action
export async function incrementUsage(
  db: D1Database, 
  userId: string, 
  action: 'create_link' | 'analytics' | 'visitor_tracking'
): Promise<void> {
  const currentMonth = getCurrentMonth();
  
  switch (action) {
    case 'create_link':
      await db.prepare(`
        UPDATE usage_tracking 
        SET links_created = links_created + 1, updated_at = ?
        WHERE user_id = ? AND month = ?
      `).bind(new Date().toISOString(), userId, currentMonth).run();
      break;
    case 'analytics':
      await db.prepare(`
        UPDATE usage_tracking 
        SET analytics_events = analytics_events + 1, updated_at = ?
        WHERE user_id = ? AND month = ?
      `).bind(new Date().toISOString(), userId, currentMonth).run();
      break;
    case 'visitor_tracking':
      await db.prepare(`
        UPDATE visitor_tracking 
        SET total_visitors = total_visitors + 1, updated_at = ?
        WHERE user_id = ? AND month = ?
      `).bind(new Date().toISOString(), userId, currentMonth).run();
      break;
    default:
      throw new Error('Invalid action');
  }
}

// Track new visitor and update last visit tracking
export async function trackNewVisitor(db: D1Database, userId: string): Promise<void> {
  // Increment visitor count
  await incrementUsage(db, userId, 'visitor_tracking');
  
  // Update last visit tracking
  const now = new Date().toISOString();
  
  // Try to update existing record
  const result = await db.prepare(`
    UPDATE last_visit_tracking 
    SET new_visitors_since_last_visit = new_visitors_since_last_visit + 1, updated_at = ?
    WHERE user_id = ?
  `).bind(now, userId).run();
  
  // If no record exists, create one
  if (result.meta && result.meta.changes === 0) {
    const trackingId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO last_visit_tracking (id, user_id, last_visit_at, new_visitors_since_last_visit)
      VALUES (?, ?, ?, 1)
    `).bind(trackingId, userId, now).run();
  }
}

// Get user's usage summary
export async function getUserUsageSummary(db: D1Database, userId: string): Promise<{
  current: UsageTracking;
  visitorTracking: VisitorTracking;
  plan: SubscriptionPlan;
  limits: {
    links: { current: number; limit: number; percentage: number };
    visitors: { current: number; limit: number | null; percentage: number };
  };
  newVisitorsSinceLastVisit: number;
}> {
  const user = await db.prepare(`
    SELECT * FROM users WHERE id = ?
  `).bind(userId).first() as any;
  
  const plan = await getSubscriptionPlan(db, user.tier);
  const usage = await getOrCreateUsageTracking(db, userId);
  const visitorTracking = await getOrCreateVisitorTracking(db, userId);
  
  if (!plan) {
    throw new Error('Invalid subscription plan');
  }
  
  // Get new visitors since last visit
  const lastVisitData = await db.prepare(`
    SELECT new_visitors_since_last_visit FROM last_visit_tracking WHERE user_id = ?
  `).bind(userId).first() as any;
  
  const newVisitorsSinceLastVisit = lastVisitData?.new_visitors_since_last_visit || 0;
  
  const calculatePercentage = (current: number, limit: number | null) => {
    if (limit === null || limit === -1) return 0; // Unlimited
    return Math.round((current / limit) * 100);
  };
  
  return {
    current: usage,
    visitorTracking,
    plan,
    limits: {
      links: {
        current: usage.links_created,
        limit: plan.limits.links_per_month,
        percentage: calculatePercentage(usage.links_created, plan.limits.links_per_month)
      },
      visitors: {
        current: visitorTracking.total_visitors,
        limit: plan.visitor_cap,
        percentage: calculatePercentage(visitorTracking.total_visitors, plan.visitor_cap)
      }
    },
    newVisitorsSinceLastVisit
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

// Check if user can see full analytics (not blurred)
export async function canSeeFullAnalytics(db: D1Database, userId: string): Promise<boolean> {
  const user = await db.prepare(`
    SELECT tier FROM users WHERE id = ?
  `).bind(userId).first() as any;
  
  const plan = await getSubscriptionPlan(db, user.tier);
  return plan?.has_full_analytics || false;
}

// Check if user can see advanced charts
export async function canSeeAdvancedCharts(db: D1Database, userId: string): Promise<boolean> {
  const user = await db.prepare(`
    SELECT tier FROM users WHERE id = ?
  `).bind(userId).first() as any;
  
  const plan = await getSubscriptionPlan(db, user.tier);
  return plan?.has_advanced_charts || false;
}

// Check if user can download PDF reports
export async function canDownloadPDF(db: D1Database, userId: string): Promise<boolean> {
  const user = await db.prepare(`
    SELECT tier FROM users WHERE id = ?
  `).bind(userId).first() as any;
  
  const plan = await getSubscriptionPlan(db, user.tier);
  return plan?.has_pdf_download || false;
}

// Update last visit time for user
export async function updateLastVisit(db: D1Database, userId: string): Promise<void> {
  const now = new Date().toISOString();
  
  // Try to update existing record
  const result = await db.prepare(`
    UPDATE last_visit_tracking 
    SET last_visit_at = ?, new_visitors_since_last_visit = 0, updated_at = ?
    WHERE user_id = ?
  `).bind(now, now, userId).run();
  
  // If no record exists, create one
  if (result.meta && result.meta.changes === 0) {
    const trackingId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO last_visit_tracking (id, user_id, last_visit_at, new_visitors_since_last_visit)
      VALUES (?, ?, ?, 0)
    `).bind(trackingId, userId, now).run();
  }
}
