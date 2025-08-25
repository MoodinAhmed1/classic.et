"use client"

import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  LinkIcon,
  BarChart3,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Activity,
  Clock,
  MousePointer,
} from "lucide-react"

export default function AdminDashboard() {
  // Mock data - will be replaced with real API calls
  const stats = {
    totalUsers: 12543,
    totalLinks: 89234,
    totalClicks: 1234567,
    revenue: 45678,
    activeUsers: 3421,
    systemHealth: 99.9,
  }

  const recentActivity = [
    { id: 1, type: "user_signup", message: "New user registered: john@example.com", time: "2 minutes ago" },
    { id: 2, type: "payment", message: "Payment received: $29.99 from user #1234", time: "5 minutes ago" },
    { id: 3, type: "link_created", message: "High-volume link created: bit.ly/campaign2024", time: "8 minutes ago" },
    { id: 4, type: "alert", message: "System alert: High CPU usage detected", time: "12 minutes ago" },
    { id: 5, type: "user_upgrade", message: "User upgraded to Pro plan: sarah@example.com", time: "15 minutes ago" },
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_signup":
        return <Users className="h-4 w-4 text-green-500" />
      case "payment":
        return <DollarSign className="h-4 w-4 text-blue-500" />
      case "link_created":
        return <LinkIcon className="h-4 w-4 text-purple-500" />
      case "alert":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "user_upgrade":
        return <TrendingUp className="h-4 w-4 text-orange-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <>
      <AdminHeader title="Dashboard Overview" subtitle="Monitor your platform's performance and key metrics" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12.5%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Links</CardTitle>
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLinks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+8.2%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClicks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+23.1%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.revenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+15.3%</span> from last month
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">System Health</span>
                <Badge className="bg-green-100 text-green-800">{stats.systemHealth}% Uptime</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Users</span>
                <span className="font-medium">{stats.activeUsers.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Server Response</span>
                <Badge className="bg-green-100 text-green-800">Fast (120ms)</Badge>
              </div>
              <Button className="w-full bg-transparent" variant="outline">
                View System Details
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100">{activity.message}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4 bg-transparent" variant="outline">
                View All Activity
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button className="h-20 flex-col gap-2">
                <Users className="h-6 w-6" />
                Manage Users
              </Button>
              <Button className="h-20 flex-col gap-2 bg-transparent" variant="outline">
                <LinkIcon className="h-6 w-6" />
                View Links
              </Button>
              <Button className="h-20 flex-col gap-2 bg-transparent" variant="outline">
                <BarChart3 className="h-6 w-6" />
                Analytics
              </Button>
              <Button className="h-20 flex-col gap-2 bg-transparent" variant="outline">
                <DollarSign className="h-6 w-6" />
                Payments
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
