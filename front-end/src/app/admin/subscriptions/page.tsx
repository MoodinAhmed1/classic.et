"use client"

import { useState, useEffect } from "react"
import { adminApi } from "@/lib/admin-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  MoreHorizontal,
  Plus,
  Edit,
  Crown,
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react"

interface Subscription {
  id: string
  user_id: string
  user_name: string
  user_email: string
  plan_id: string
  plan_name: string
  tier: "free" | "pro" | "premium"
  status: "active" | "canceled" | "past_due" | "unpaid"
  billing_cycle: "monthly" | "yearly"
  amount: number
  currency: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

interface SubscriptionPlan {
  id: string
  name: string
  tier: "free" | "pro" | "premium"
  priceMonthly: number
  priceYearly: number
  features: string[]
  limits: {
    links_per_month: number
    api_requests_per_month: number
    custom_domains: number
    analytics_retention_days: number
    team_members: number
  }
  visitorCap?: number | null
  hasFullAnalytics?: boolean
  hasAdvancedCharts?: boolean
  hasPdfDownload?: boolean
  createdAt: string
}

interface PaymentTransaction {
  id: string
  user_id: string
  user_name: string
  user_email: string
  plan_name: string
  tx_ref: string
  amount: number
  currency: string
  billing_cycle: "monthly" | "yearly"
  status: "pending" | "success" | "failed" | "cancelled"
  created_at: string
  updated_at: string
}

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [tierFilter, setTierFilter] = useState<string>("all")
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [isEditPlanDialogOpen, setIsEditPlanDialogOpen] = useState(false)
  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false)
  const [revenueData, setRevenueData] = useState<{ total: number; monthly: number; yearly: number }>({ total: 0, monthly: 0, yearly: 0 })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getSubscriptions()
      setSubscriptions(res.subscriptions as any)
      
      // Store revenue data from backend
      if (res.revenue) {
        setRevenueData(res.revenue)
      }
      
      // Fetch subscription plans
      try {
        const plansRes = await adminApi.getSubscriptionPlans()
        setPlans(plansRes.plans as any)
      } catch (e) {
        console.error("Failed to fetch plans:", e)
        setPlans([])
      }
      
      // Fetch transactions
      try {
        const tx = await adminApi.getTransactions()
        setTransactions(tx.transactions as any)
      } catch (e) {
        console.error("Failed to fetch transactions:", e)
        setTransactions([])
      }

      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch subscription data:", error)
      setLoading(false)
    }
  }

  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const matchesSearch =
      subscription.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.plan_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || subscription.status === statusFilter
    const matchesTier = tierFilter === "all" || subscription.tier === tierFilter

    return matchesSearch && matchesStatus && matchesTier
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "past_due":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "canceled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "unpaid":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "premium":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "pro":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const getTransactionStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const getTransactionStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4" />
      case "pending":
        return <Clock className="h-4 w-4" />
      case "failed":
        return <XCircle className="h-4 w-4" />
      case "cancelled":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString()} ${currency}`
  }

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
    setIsEditPlanDialogOpen(true)
  }

  const handleSavePlan = async () => {
    if (!selectedPlan) return
    
    try {
      const formData = {
        name: (document.getElementById('edit-plan-name') as HTMLInputElement)?.value || selectedPlan.name,
        tier: selectedPlan.tier,
        priceMonthly: parseInt((document.getElementById('edit-monthly-price') as HTMLInputElement)?.value || selectedPlan.priceMonthly.toString()),
        priceYearly: parseInt((document.getElementById('edit-yearly-price') as HTMLInputElement)?.value || selectedPlan.priceYearly.toString()),
        features: (document.getElementById('edit-features') as HTMLTextAreaElement)?.value?.split('\n').filter(f => f.trim()) || selectedPlan.features,
        limits: selectedPlan.limits,
        visitorCap: selectedPlan.limits.links_per_month === -1 ? null : selectedPlan.limits.links_per_month,
        hasFullAnalytics: selectedPlan.limits.analytics_retention_days > 30,
        hasAdvancedCharts: selectedPlan.limits.analytics_retention_days > 30,
        hasPdfDownload: selectedPlan.limits.analytics_retention_days > 30
      }

      await adminApi.updateSubscriptionPlan(selectedPlan.id, formData)
      setIsEditPlanDialogOpen(false)
      setSelectedPlan(null)
      fetchData() // Refresh data
    } catch (error) {
      console.error('Failed to update plan:', error)
    }
  }

  const handleCreatePlan = async () => {
    try {
      const formData = {
        name: (document.getElementById('plan-name') as HTMLInputElement)?.value || '',
        tier: (document.getElementById('plan-tier') as HTMLSelectElement)?.value || 'pro',
        priceMonthly: parseInt((document.getElementById('monthly-price') as HTMLInputElement)?.value || '0'),
        priceYearly: parseInt((document.getElementById('yearly-price') as HTMLInputElement)?.value || '0'),
        features: (document.getElementById('features') as HTMLTextAreaElement)?.value?.split('\n').filter(f => f.trim()) || [],
        limits: {
          links_per_month: 100,
          api_requests_per_month: 1000,
          custom_domains: 1,
          analytics_retention_days: 30,
          team_members: 1
        },
        visitorCap: null,
        hasFullAnalytics: false,
        hasAdvancedCharts: false,
        hasPdfDownload: false
      }

      await adminApi.createSubscriptionPlan(formData)
      setIsCreatePlanDialogOpen(false)
      fetchData() // Refresh data
    } catch (error) {
      console.error('Failed to create plan:', error)
    }
  }

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return
    }

    try {
      await adminApi.deleteSubscriptionPlan(planId)
      fetchData() // Refresh data
    } catch (error) {
      console.error('Failed to delete plan:', error)
    }
  }

  const handleCancelSubscription = async (subscriptionId: string) => {
    console.log("Canceling subscription:", subscriptionId)
    // API call to cancel subscription
  }

  const handleRefundTransaction = async (transactionId: string) => {
    console.log("Refunding transaction:", transactionId)
    // API call to refund transaction
  }

  const handleDownloadTransactions = async () => {
    try {
      const response = await adminApi.downloadTransactions('csv')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download transactions:', error)
    }
  }

  // Calculate stats
  const stats = {
    totalSubscriptions: subscriptions.length,
    activeSubscriptions: subscriptions.filter((s) => s.status === "active").length,
    monthlyRevenue: revenueData.monthly,
    yearlyRevenue: revenueData.yearly,
  }

  return (
    <div className="space-y-3 md:space-y-6 px-1 md:px-0">
      {/* Header */}
      <div className="min-w-0">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Subscription Management</h2>
        <p className="text-xs md:text-sm lg:text-base text-muted-foreground">Manage subscription plans, billing, and payments</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-2 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium truncate">Total Subscriptions</CardTitle>
            <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-base md:text-lg lg:text-2xl font-bold">{stats.totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground truncate">All subscription plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium truncate">Active Subscriptions</CardTitle>
            <CheckCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-base md:text-lg lg:text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground truncate">
              {stats.totalSubscriptions > 0 ? ((stats.activeSubscriptions / stats.totalSubscriptions) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium truncate">Monthly Revenue</CardTitle>
            <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-base md:text-lg lg:text-2xl font-bold">{formatCurrency(stats.monthlyRevenue, "ETB")}</div>
            <p className="text-xs text-muted-foreground truncate">Recurring monthly</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium truncate">Yearly Revenue</CardTitle>
            <TrendingUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-base md:text-lg lg:text-2xl font-bold">{formatCurrency(stats.yearlyRevenue, "ETB")}</div>
            <p className="text-xs text-muted-foreground truncate">Annual subscriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="subscriptions" className="space-y-3 md:space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="subscriptions" className="text-xs md:text-sm px-2 py-1">Subscriptions</TabsTrigger>
          <TabsTrigger value="plans" className="text-xs md:text-sm px-2 py-1">Plans</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs md:text-sm px-2 py-1">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-3 md:space-y-6">
          <div className="grid gap-3 grid-cols-1">
            <Card>
              <CardHeader className="pb-2">
                <div className="space-y-2 md:space-y-0 md:flex md:items-center md:justify-between">
                  <CardTitle className="text-base md:text-lg lg:text-xl">Active Subscriptions</CardTitle>
                  <Button onClick={fetchData} className="w-full md:w-auto">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                <div className="space-y-3">
                  <div className="space-y-2 md:space-y-0 md:flex md:gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search subscriptions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-40">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="canceled">Canceled</SelectItem>
                          <SelectItem value="past_due">Past Due</SelectItem>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={tierFilter} onValueChange={setTierFilter}>
                        <SelectTrigger className="w-full md:w-40">
                          <SelectValue placeholder="Filter by tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Tiers</SelectItem>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {filteredSubscriptions.map((subscription) => (
                      <div key={subscription.id} className="flex items-center justify-between p-2 md:p-3 border rounded-lg">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs md:text-sm font-medium flex-shrink-0">
                            {subscription.user_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate text-sm md:text-base">{subscription.user_name}</div>
                            <div className="text-xs md:text-sm text-muted-foreground truncate">{subscription.user_email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                          <div className="hidden md:flex flex-col items-end gap-1">
                            <Badge className={getStatusColor(subscription.status)}>{subscription.status}</Badge>
                            <Badge className={getTierColor(subscription.tier)}>{subscription.tier}</Badge>
                          </div>
                          <div className="flex md:hidden flex-col gap-1">
                            <Badge className={`${getStatusColor(subscription.status)} text-xs px-1`}>{subscription.status}</Badge>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Subscription
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleCancelSubscription(subscription.id)}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel Subscription
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-3 md:space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="space-y-2 md:space-y-0 md:flex md:items-center md:justify-between">
                  <CardTitle className="text-base md:text-lg lg:text-xl">Subscription Plans</CardTitle>
                  <Dialog open={isCreatePlanDialogOpen} onOpenChange={setIsCreatePlanDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full md:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Plan
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create New Subscription Plan</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="plan-name">Plan Name</Label>
                            <Input id="plan-name" placeholder="e.g., Enterprise" />
                          </div>
                          <div>
                            <Label htmlFor="plan-tier">Tier</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select tier" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="monthly-price">Monthly Price (ETB)</Label>
                            <Input id="monthly-price" type="number" placeholder="30000" />
                          </div>
                          <div>
                            <Label htmlFor="yearly-price">Yearly Price (ETB)</Label>
                            <Input id="yearly-price" type="number" placeholder="300000" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="features">Features (one per line)</Label>
                          <Textarea id="features" placeholder="Advanced analytics&#10;Custom domains&#10;API access" />
                        </div>
                        <div className="flex gap-2">
                          <Button className="flex-1" onClick={handleCreatePlan}>Create Plan</Button>
                          <Button variant="outline" onClick={() => setIsCreatePlanDialogOpen(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                  {plans.map((plan) => (
                    <Card key={plan.id} className="relative">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            {plan.tier === "premium" && <Crown className="h-5 w-5 text-purple-600" />}
                            {plan.name}
                          </CardTitle>
                          <Badge className={getTierColor(plan.tier)}>{plan.tier.toUpperCase()}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="text-2xl font-bold">
                            {plan.priceMonthly === 0 ? "Free" : formatCurrency(plan.priceMonthly, "ETB")}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {plan.priceMonthly === 0
                              ? "Forever free"
                              : `${formatCurrency(plan.priceYearly, "ETB")} yearly`}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Features:</h4>
                          <ul className="text-sm space-y-1">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Limits:</h4>
                          <div className="text-sm space-y-1">
                            <div>
                              Links: {plan.limits.links_per_month === -1 ? "Unlimited" : plan.limits.links_per_month}
                            </div>
                            <div>
                              API Requests:{" "}
                              {plan.limits.api_requests_per_month === -1
                                ? "Unlimited"
                                : plan.limits.api_requests_per_month}
                            </div>
                            <div>Custom Domains: {plan.limits.custom_domains}</div>
                            <div>Analytics: {plan.limits.analytics_retention_days} days</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 bg-transparent"
                            onClick={() => handleEditPlan(plan)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Plan
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-red-50 text-red-600 hover:bg-red-100"
                            onClick={() => handleDeletePlan(plan.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        <TabsContent value="transactions" className="space-y-3 md:space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="space-y-2 md:space-y-0 md:flex md:items-center md:justify-between">
                  <CardTitle className="text-base md:text-lg lg:text-xl">Payment Transactions</CardTitle>
                  <Button onClick={handleDownloadTransactions} className="w-full md:w-auto">
                    <Download className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Export Transactions</span>
                    <span className="sm:hidden">Export</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-1 md:px-6">
                {/* Mobile-first transactions layout */}
                <div className="block md:hidden">
                  {loading ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Clock className="h-6 w-6 mx-auto mb-2" />
                      <p className="text-xs">Loading transactions...</p>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <DollarSign className="h-6 w-6 mx-auto mb-2" />
                      <p className="text-xs">No transactions found.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((transaction) => (
                        <Card key={transaction.id} className="border">
                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className={getTransactionStatusColor(transaction.status)} variant="outline">
                                    <span className="flex items-center gap-1 text-xs">
                                      {getTransactionStatusIcon(transaction.status)}
                                      {transaction.status.toUpperCase()}
                                    </span>
                                  </Badge>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-6 w-6 p-0">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                    {transaction.status === "success" && (
                                      <DropdownMenuItem
                                        onClick={() => handleRefundTransaction(transaction.id)}
                                        className="text-red-600"
                                      >
                                        Issue Refund
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div>
                                <div className="font-medium text-sm truncate">{transaction.user_name}</div>
                                <div className="text-xs text-muted-foreground truncate">{transaction.user_email}</div>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Plan:</span>
                                <span className="font-medium truncate max-w-[120px]">{transaction.plan_name}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Amount:</span>
                                <span className="font-bold">{formatCurrency(transaction.amount, transaction.currency)}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Date:</span>
                                <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Tx ID:</span>
                                <span className="font-mono text-xs truncate max-w-[120px]">{transaction.tx_ref}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Desktop table layout */}
                <div className="hidden md:block overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Transaction ID</TableHead>
                        <TableHead className="min-w-0">User</TableHead>
                        <TableHead className="w-24">Plan</TableHead>
                        <TableHead className="w-24">Amount</TableHead>
                        <TableHead className="w-20">Status</TableHead>
                        <TableHead className="w-20">Date</TableHead>
                        <TableHead className="text-right w-16">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading transactions...
                          </TableCell>
                        </TableRow>
                      ) : transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            No transactions found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-mono text-xs">{transaction.tx_ref}</TableCell>
                            <TableCell className="min-w-0">
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">{transaction.user_name}</div>
                                <div className="text-xs text-muted-foreground truncate">{transaction.user_email}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm truncate">{transaction.plan_name}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(transaction.amount, transaction.currency)}</TableCell>
                            <TableCell>
                              <Badge className={getTransactionStatusColor(transaction.status)} variant="outline">
                                <span className="flex items-center gap-1 text-xs">
                                  {getTransactionStatusIcon(transaction.status)}
                                  {transaction.status.toUpperCase()}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>View Details</DropdownMenuItem>
                                  {transaction.status === "success" && (
                                    <DropdownMenuItem
                                      onClick={() => handleRefundTransaction(transaction.id)}
                                      className="text-red-600"
                                    >
                                      Issue Refund
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  )
}
