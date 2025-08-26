"use client"

import { useState, useEffect } from "react"
import { adminApi } from "@/lib/admin-api"
import { AdminHeader } from "@/components/admin-header"
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
  price_monthly: number
  price_yearly: number
  features: string[]
  limits: {
    links_per_month: number
    api_requests_per_month: number
    custom_domains: number
    analytics_retention_days: number
    team_members: number
  }
  created_at: string
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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getSubscriptions()
      setSubscriptions(res.subscriptions as any)
      setPlans([])
      try {
        const tx = await adminApi.getTransactions()
        setTransactions(tx.transactions as any)
      } catch (e) {
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

  const handleCancelSubscription = async (subscriptionId: string) => {
    console.log("Canceling subscription:", subscriptionId)
    // API call to cancel subscription
  }

  const handleRefundTransaction = async (transactionId: string) => {
    console.log("Refunding transaction:", transactionId)
    // API call to refund transaction
  }

  // Calculate stats
  const stats = {
    totalSubscriptions: subscriptions.length,
    activeSubscriptions: subscriptions.filter((s) => s.status === "active").length,
    monthlyRevenue: subscriptions
      .filter((s) => s.status === "active" && s.billing_cycle === "monthly")
      .reduce((sum, s) => sum + s.amount, 0),
    yearlyRevenue: subscriptions
      .filter((s) => s.status === "active" && s.billing_cycle === "yearly")
      .reduce((sum, s) => sum + s.amount, 0),
  }

  return (
    <>
      <AdminHeader title="Subscription Management" subtitle="Manage subscription plans, billing, and payments" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubscriptions}</div>
              <p className="text-xs text-muted-foreground">All subscription plans</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.activeSubscriptions / stats.totalSubscriptions) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue, "ETB")}</div>
              <p className="text-xs text-muted-foreground">Recurring monthly</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Yearly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.yearlyRevenue, "ETB")}</div>
              <p className="text-xs text-muted-foreground">Annual subscriptions</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="subscriptions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <CardTitle>Active Subscriptions</CardTitle>
                  <Button onClick={fetchData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search subscriptions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
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
                    <SelectTrigger className="w-full sm:w-40">
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

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Billing</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading subscriptions...
                          </TableCell>
                        </TableRow>
                      ) : filteredSubscriptions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            No subscriptions found matching your criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSubscriptions.map((subscription) => (
                          <TableRow key={subscription.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{subscription.user_name}</div>
                                <div className="text-sm text-muted-foreground">{subscription.user_email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getTierColor(subscription.tier)}>
                                {subscription.plan_name.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(subscription.status)}>
                                {subscription.status.replace("_", " ").toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{subscription.billing_cycle.toUpperCase()}</Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(subscription.amount, subscription.currency)}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{new Date(subscription.current_period_start).toLocaleDateString()}</div>
                                <div className="text-muted-foreground">
                                  to {new Date(subscription.current_period_end).toLocaleDateString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Subscription
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Change Billing Date
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleCancelSubscription(subscription.id)}
                                    className="text-red-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel Subscription
                                  </DropdownMenuItem>
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

          <TabsContent value="plans" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <CardTitle>Subscription Plans</CardTitle>
                  <Dialog open={isCreatePlanDialogOpen} onOpenChange={setIsCreatePlanDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
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
                          <Button className="flex-1">Create Plan</Button>
                          <Button variant="outline" onClick={() => setIsCreatePlanDialogOpen(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                            {plan.price_monthly === 0 ? "Free" : formatCurrency(plan.price_monthly, "ETB")}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {plan.price_monthly === 0
                              ? "Forever free"
                              : `${formatCurrency(plan.price_yearly, "ETB")} yearly`}
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
                        <Button
                          variant="outline"
                          className="w-full bg-transparent"
                          onClick={() => handleEditPlan(plan)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Plan
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <CardTitle>Payment Transactions</CardTitle>
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Export Transactions
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
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
                            <TableCell className="font-mono text-sm">{transaction.tx_ref}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{transaction.user_name}</div>
                                <div className="text-sm text-muted-foreground">{transaction.user_email}</div>
                              </div>
                            </TableCell>
                            <TableCell>{transaction.plan_name}</TableCell>
                            <TableCell>{formatCurrency(transaction.amount, transaction.currency)}</TableCell>
                            <TableCell>
                              <Badge className={getTransactionStatusColor(transaction.status)}>
                                <span className="flex items-center gap-1">
                                  {getTransactionStatusIcon(transaction.status)}
                                  {transaction.status.toUpperCase()}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
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

        {/* Edit Plan Dialog */}
        <Dialog open={isEditPlanDialogOpen} onOpenChange={setIsEditPlanDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Subscription Plan</DialogTitle>
            </DialogHeader>
            {selectedPlan && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-plan-name">Plan Name</Label>
                    <Input id="edit-plan-name" defaultValue={selectedPlan.name} />
                  </div>
                  <div>
                    <Label htmlFor="edit-plan-tier">Tier</Label>
                    <Select defaultValue={selectedPlan.tier}>
                      <SelectTrigger>
                        <SelectValue />
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
                    <Label htmlFor="edit-monthly-price">Monthly Price (ETB)</Label>
                    <Input id="edit-monthly-price" type="number" defaultValue={selectedPlan.price_monthly} />
                  </div>
                  <div>
                    <Label htmlFor="edit-yearly-price">Yearly Price (ETB)</Label>
                    <Input id="edit-yearly-price" type="number" defaultValue={selectedPlan.price_yearly} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-features">Features (one per line)</Label>
                  <Textarea id="edit-features" defaultValue={selectedPlan.features.join("\n")} />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1">Save Changes</Button>
                  <Button variant="outline" onClick={() => setIsEditPlanDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </>
  )
}
