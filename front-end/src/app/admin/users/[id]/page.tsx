"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User, Mail, Activity, BarChart3, CreditCard, Settings, Ban, CheckCircle } from "lucide-react"

interface UserDetails {
  id: string
  email: string
  name: string | null
  tier: "free" | "pro" | "premium"
  created_at: string
  updated_at: string
  is_active: boolean
  last_login: string | null
  link_count: number
  total_clicks: number
  subscription_status: string
  payment_method: string | null
}

interface UserLink {
  id: string
  original_url: string
  short_code: string
  title: string | null
  click_count: number
  created_at: string
  is_active: boolean
}

interface UserActivity {
  id: string
  action: string
  description: string
  timestamp: string
  ip_address: string
}

export default function UserDetailsPage() {
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<UserDetails | null>(null)
  const [userLinks, setUserLinks] = useState<UserLink[]>([])
  const [userActivity, setUserActivity] = useState<UserActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data - replace with real API calls
    const mockUser: UserDetails = {
      id: userId,
      email: "john@example.com",
      name: "John Doe",
      tier: "pro",
      created_at: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-20T14:22:00Z",
      is_active: true,
      last_login: "2024-01-25T09:15:00Z",
      link_count: 45,
      total_clicks: 1250,
      subscription_status: "active",
      payment_method: "visa_1234",
    }

    const mockLinks: UserLink[] = [
      {
        id: "1",
        original_url: "https://example.com/very-long-url-here",
        short_code: "abc123",
        title: "Example Website",
        click_count: 234,
        created_at: "2024-01-20T10:30:00Z",
        is_active: true,
      },
      {
        id: "2",
        original_url: "https://another-example.com/page",
        short_code: "def456",
        title: "Another Page",
        click_count: 89,
        created_at: "2024-01-18T14:22:00Z",
        is_active: true,
      },
    ]

    const mockActivity: UserActivity[] = [
      {
        id: "1",
        action: "link_created",
        description: "Created new link: abc123",
        timestamp: "2024-01-25T09:15:00Z",
        ip_address: "192.168.1.1",
      },
      {
        id: "2",
        action: "login",
        description: "User logged in",
        timestamp: "2024-01-25T09:10:00Z",
        ip_address: "192.168.1.1",
      },
    ]

    setTimeout(() => {
      setUser(mockUser)
      setUserLinks(mockLinks)
      setUserActivity(mockActivity)
      setLoading(false)
    }, 1000)
  }, [userId])

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

  if (loading) {
    return (
      <>
        <AdminHeader title="User Details" subtitle="Loading user information..." />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="text-center py-8">Loading...</div>
        </main>
      </>
    )
  }

  if (!user) {
    return (
      <>
        <AdminHeader title="User Details" subtitle="User not found" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="text-center py-8">User not found</div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader title={`${user.name || user.email}`} subtitle={`User ID: ${user.id}`} />

      <main className="flex-1 overflow-y-auto p-6">
        {/* User Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-sm">{user.name || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Subscription Tier</label>
                  <Badge className={getTierColor(user.tier)}>{user.tier.toUpperCase()}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge className={user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {user.is_active ? "Active" : "Suspended"}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Joined</label>
                  <p className="text-sm">{new Date(user.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Login</label>
                  <p className="text-sm">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                {user.is_active ? (
                  <Button variant="outline">
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend User
                  </Button>
                ) : (
                  <Button variant="outline">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate User
                  </Button>
                )}
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit User
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Links</span>
                <span className="font-medium">{user.link_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Clicks</span>
                <span className="font-medium">{user.total_clicks.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg. Clicks/Link</span>
                <span className="font-medium">
                  {user.link_count > 0 ? Math.round(user.total_clicks / user.link_count) : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Subscription</span>
                <Badge className="bg-green-100 text-green-800">{user.subscription_status.toUpperCase()}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information Tabs */}
        <Card>
          <CardContent className="p-0">
            <Tabs defaultValue="links" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="links">Links</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
              </TabsList>

              <TabsContent value="links" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">User Links</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Short Code</TableHead>
                        <TableHead>Original URL</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Clicks</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userLinks.map((link) => (
                        <TableRow key={link.id}>
                          <TableCell className="font-mono">{link.short_code}</TableCell>
                          <TableCell className="max-w-xs truncate">{link.original_url}</TableCell>
                          <TableCell>{link.title || "No title"}</TableCell>
                          <TableCell>{link.click_count}</TableCell>
                          <TableCell>{new Date(link.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge
                              className={link.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                            >
                              {link.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Recent Activity</h3>
                  <div className="space-y-3">
                    {userActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <Activity className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm">{activity.description}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>{new Date(activity.timestamp).toLocaleString()}</span>
                            <span>IP: {activity.ip_address}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="billing" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Billing Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Subscription Status</label>
                      <p className="text-sm">{user.subscription_status}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Payment Method</label>
                      <p className="text-sm">{user.payment_method || "None"}</p>
                    </div>
                  </div>
                  <Button>
                    <CreditCard className="h-4 w-4 mr-2" />
                    View Payment History
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
