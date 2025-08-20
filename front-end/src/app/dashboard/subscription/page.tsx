'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Crown, 
  Zap, 
  Check, 
  X, 
  ArrowUpRight, 
  Calendar, 
  CreditCard, 
  BarChart3,
  Globe,
  Code,
  Users,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { subscriptionApi } from '@/lib/api';

interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'free' | 'pro' | 'premium';
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: {
    links_per_month: number;
    analytics_retention_days: number;
    team_members: number;
  };
}
 
interface UsageSummary {
  current: {
    id: string;
    user_id: string;
    month: string;
    links_created: number;
    analytics_events: number;
    created_at: string;
    updated_at: string;
  };
  plan: {
    id: string;
    name: string;
    tier: 'free' | 'pro' | 'premium';
    priceMonthly: number;
    priceYearly: number;
    features: string[];
    limits: {
      links_per_month: number;
      analytics_retention_days: number;
      team_members: number;
    };
  };
  limits: {
    links: { current: number; limit: number; percentage: number };
    visitors: { current: number; limit: number | null; percentage: number };
  };
}

interface CurrentSubscription {
  user: {
    id: string;
    email: string;
    name: string;
    tier: 'free' | 'pro' | 'premium';
    subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'unpaid';
    subscriptionId?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd: boolean;
    createdAt: string;
    updatedAt: string;
  };
  plan: {
    id: string;
    name: string;
    tier: 'free' | 'pro' | 'premium';
    priceMonthly: number;
    priceYearly: number;
    features: string[];
    limits: {
      links_per_month: number;
      analytics_retention_days: number;
      team_members: number;
    };
  };
}

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscriptionData();
    
    // Check for payment success/failure in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const status = urlParams.get('status');
    const txRef = urlParams.get('tx_ref') || urlParams.get('txRef') || urlParams.get('reference');
    
    if ((success === 'true' || status === 'success') && txRef) {
      // Verify the transaction
      verifyTransaction(txRef);
    }
  }, []);

  const verifyTransaction = async (txRef: string) => {
    try {
      const result = await subscriptionApi.verifyTransaction(txRef);
      
      if (result.status === 'success') {
        toast({
          title: "Payment Successful!",
          description: "Your subscription has been activated. Welcome to the premium plan!",
          variant: "default",
        });
        
        // Refresh subscription data
        fetchSubscriptionData();
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        toast({
          title: "Payment Verification Failed",
          description: "Please contact support if you believe this is an error.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Error",
        description: "Failed to verify payment. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const fetchSubscriptionData = async () => {
    setIsLoading(true);
    try {
      // Fetch plans
      const plansData = await subscriptionApi.getPlans();
      setPlans(plansData.plans);
      console.log(plansData)

      // Fetch current subscription
      const currentData = await subscriptionApi.getCurrent();
      setCurrentSubscription(currentData);
      console.log(currentData)

      // Fetch usage summary
      const usageData = await subscriptionApi.getUsage();
      console.log(usageData)
      setUsageSummary(usageData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load subscription data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly') => {
    setSelectedPlan(planId);
    setSelectedBillingCycle(billingCycle);
    setShowPhoneModal(true);
  };

  const handlePayment = async () => {
    if (!phoneNumber || !selectedPlan) return;
    
    setIsUpgrading(true);
    try {
      const response = await subscriptionApi.initializePayment({
        planId: selectedPlan,
        billingCycle: selectedBillingCycle,
        phoneNumber: phoneNumber,
      });

      console.log('Chapa init response:', response);
      // Redirect to Chapa checkout
      window.location.href = response.url;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
      setShowPhoneModal(false);
      setPhoneNumber('');
      setSelectedPlan(null);
    }
  };

  const handleBillingPortal = async () => {
    try {
      const response = await fetch('/api/subscription/billing-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to create billing portal session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe billing portal
      window.location.href = url;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'free':
        return <Zap className="h-5 w-5" />;
      case 'pro':
        return <Crown className="h-5 w-5" />;
      case 'premium':
        return <Crown className="h-5 w-5 text-yellow-500" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'pro':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'premium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatPrice = (price: number) => {
    return `${(price / 100).toFixed(0)} ETB`;
  };

  const formatLimit = (limit: number | null) => {
    if (limit === null || limit === -1) return 'Unlimited';
    return limit.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your subscription and view usage
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Current Plan */}
          {currentSubscription && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getTierIcon(currentSubscription.user.tier)}
                      {currentSubscription.plan.name} Plan
                    </CardTitle>
                    <CardDescription>
                      Your current subscription details
                    </CardDescription>
                  </div>
                  <Badge className={getTierColor(currentSubscription.user.tier)}>
                    {currentSubscription.user.subscriptionStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {currentSubscription.user.currentPeriodEnd 
                        ? `Renews ${new Date(currentSubscription.user.currentPeriodEnd).toLocaleDateString()}`
                        : 'No active subscription'
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {currentSubscription.plan.priceMonthly > 0 
                        ? `${formatPrice(currentSubscription.plan.priceMonthly)}/month`
                        : 'Free'
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatLimit(currentSubscription.plan.limits.team_members)} team member{currentSubscription.plan.limits.team_members !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {currentSubscription.user.tier === 'free' ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <ArrowUpRight className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">
                          Ready to upgrade?
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          Get more links, advanced analytics, and custom domains with our Pro plans.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-green-900 dark:text-green-100">
                          Manage Subscription
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          Update payment methods, view invoices, or cancel your subscription.
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleBillingPortal}
                        className="text-green-700 border-green-300 hover:bg-green-100 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900/30"
                      >
                        Manage Billing
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          {usageSummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Links Created</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {usageSummary.limits.links.current} / {formatLimit(usageSummary.limits.links.limit)}
                  </div>
                  <Progress value={usageSummary.limits.links.percentage} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {usageSummary.limits.links.percentage}% of monthly limit
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Analytics Retention</CardTitle>
                  <Code className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {currentSubscription?.plan.limits.analytics_retention_days || 7} days
                  </div>
                  <Progress value={100} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Data retention period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Visitor Cap</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {usageSummary.limits.visitors.current.toLocaleString()} / {formatLimit(usageSummary.limits.visitors.limit)}
                  </div>
                  <Progress value={usageSummary.limits.visitors.limit === null ? 100 : usageSummary.limits.visitors.percentage} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {usageSummary.limits.visitors.limit === null ? 'Unlimited' : `${usageSummary.limits.visitors.percentage}% of monthly limit`}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${currentSubscription?.user.tier === plan.tier ? 'ring-2 ring-blue-500' : ''}`}>
                {currentSubscription?.user.tier === plan.tier && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">Current Plan</Badge>
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    {getTierIcon(plan.tier)}
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold">
                      {plan.priceMonthly === 0 ? 'Free' : formatPrice(plan.priceMonthly)}
                      {plan.priceMonthly > 0 && <span className="text-lg font-normal text-gray-500">/month</span>}
                    </div>
                    {plan.priceYearly > 0 && (
                      <p className="text-sm text-gray-500">
                        {formatPrice(plan.priceYearly)}/year (save 17%)
                      </p>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Links per month:</span>
                      <span className="font-medium">{formatLimit(plan.limits.links_per_month)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Analytics retention:</span>
                      <span className="font-medium">{plan.limits.analytics_retention_days} days</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Team members:</span>
                      <span className="font-medium">{formatLimit(plan.limits.team_members)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      variant={currentSubscription?.user.tier === plan.tier ? "outline" : "default"}
                      disabled={currentSubscription?.user.tier === plan.tier || isUpgrading}
                      onClick={() => handleUpgrade(plan.id, 'monthly')}
                    >
                      {isUpgrading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : currentSubscription?.user.tier === plan.tier ? (
                        'Current Plan'
                      ) : (
                        'Monthly'
                      )}
                    </Button>
                    {plan.priceYearly > 0 && (
                      <Button 
                        className="w-full" 
                        variant="outline"
                        disabled={currentSubscription?.user.tier === plan.tier || isUpgrading}
                        onClick={() => handleUpgrade(plan.id, 'yearly')}
                      >
                        {isUpgrading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : currentSubscription?.user.tier === plan.tier ? (
                          'Current Plan'
                        ) : (
                          'Yearly (Save 17%)'
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          {usageSummary && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Usage</CardTitle>
                <CardDescription>
                  Your usage for {usageSummary.current.month}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Links Created</span>
                      <span className="text-sm text-gray-500">
                        {usageSummary.limits.links.current} / {formatLimit(usageSummary.limits.links.limit)}
                      </span>
                    </div>
                    <Progress value={usageSummary.limits.links.percentage} className="h-2" />
                    {usageSummary.limits.links.percentage >= 80 && (
                      <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Approaching limit
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Analytics Events</span>
                      <span className="text-sm text-gray-500">
                        {usageSummary.current.analytics_events.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <div className="h-2 bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Unlimited</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Visitor Cap</span>
                      <span className="text-sm text-gray-500">
                        Unlimited
                      </span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                </div>

                <Separator />

                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Need more resources?
                  </p>
                  <Button onClick={() => handleUpgrade('pro')}>
                    Upgrade Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All your subscription payments and references</CardDescription>
            </CardHeader>
            <CardContent>
              <SubscriptionHistoryTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Phone Number Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Enter Phone Number</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please enter your phone number to continue with the payment.
            </p>
            <input
              type="tel"
              placeholder="Phone Number (e.g., +251912345678)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowPhoneModal(false);
                  setPhoneNumber('');
                  setSelectedPlan(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={!phoneNumber.trim() || isUpgrading}
                className="flex-1"
              >
                {isUpgrading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  'Continue to Payment'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubscriptionHistoryTable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<{
    txRef: string;
    refId: string | null;
    amount: number;
    currency: string;
    billingCycle: 'monthly' | 'yearly';
    status: string;
    createdAt: string;
    updatedAt: string;
    planName: string;
    planTier: 'free' | 'pro' | 'premium';
  }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await subscriptionApi.getHistory();
        setRows(res.history);
      } catch (e) {
        setError('Failed to load payment history');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading history...</div>;
  }
  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }
  if (!rows.length) {
    return <div className="text-sm text-muted-foreground">No payments yet.</div>;
  }

  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3">Date</th>
            <th className="text-left p-3">Plan</th>
            <th className="text-left p-3">Amount</th>
            <th className="text-left p-3">Billing</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">tx_ref</th>
            <th className="text-left p-3">ref_id</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.txRef}-${r.createdAt}`} className="border-t">
              <td className="p-3">{new Date(r.createdAt).toLocaleString()}</td>
              <td className="p-3">{r.planName || r.planTier}</td>
              <td className="p-3">{r.amount} {r.currency}</td>
              <td className="p-3 capitalize">{r.billingCycle}</td>
              <td className="p-3 uppercase">{r.status}</td>
              <td className="p-3 font-mono text-xs break-all">{r.txRef}</td>
              <td className="p-3 font-mono text-xs break-all">{r.refId || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
