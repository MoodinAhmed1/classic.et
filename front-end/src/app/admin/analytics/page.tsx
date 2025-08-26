"use client"

import { useState, useEffect } from "react"
import { adminApi } from "@/lib/admin-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Users,
  MousePointer,
  LinkIcon,
  Globe,
  Smartphone,
  Monitor,
  Download,
  BarChart3,
  Activity,
} from "lucide-react"

interface AnalyticsData {
  overview: {
    totalClicks: number
    totalUsers: number
    totalLinks: number
    clicksGrowth: number
    usersGrowth: number
    linksGrowth: number
  }
  clicksOverTime: Array<{
    date: string
    clicks: number
    users: number
    links: number
  }>
  deviceStats: Array<{
    device: string
    count: number
    percentage: number
  }>
  browserStats: Array<{
    browser: string
    count: number
    percentage: number
  }>
  countryStats: Array<{
    country: string
    count: number
    percentage: number
  }>
  topLinks: Array<{
    id: string
    title: string
    shortCode: string
    clicks: number
    user: string
  }>
  revenueOverTime: Array<{
    date: string
    revenue: number
    subscriptions: number
  }>
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("30d")
  const [chartType, setChartType] = useState("line")

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true)
      const days = timeRange === "7d" ? 7 : timeRange === "90d" ? 90 : timeRange === "1y" ? 365 : 30
      const res = await adminApi.getSystemAnalytics(days)
      const data: AnalyticsData = {
        overview: {
          totalClicks: res.overview.totalClicks || 0,
          totalUsers: res.overview.totalUsers || 0,
          totalLinks: res.overview.totalLinks || 0,
          clicksGrowth: 0,
          usersGrowth: 0,
          linksGrowth: 0,
        },
        clicksOverTime: Object.entries(res.clicksByDate || {}).map(([date, clicks]) => ({
          date,
          clicks: Number(clicks || 0),
          users: 0,
          links: 0,
        })),
        deviceStats: (res.deviceStats || []).map((d: any) => ({ device: d.device, count: d.count, percentage: 0 })),
        browserStats: (res.browserStats || []).map((b: any) => ({ browser: b.browser, count: b.count, percentage: 0 })),
        countryStats: (res.countryStats || []).map((c: any) => ({ country: c.country, count: c.count, percentage: 0 })),
        topLinks: (res.topLinks || []).map((l: any) => ({
          id: l.id,
          title: l.title || l.original_url || "Untitled",
          shortCode: l.short_code,
          clicks: l.click_count || 0,
          user: l.user_name || l.user_id || "",
        })),
        revenueOverTime: [],
      }
      setAnalyticsData(data)
    } catch (error) {
      console.error("Failed to fetch analytics data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    )
  }

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? "text-green-500" : "text-red-500"
  }

  const COLORS = ["#646cff", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-muted-foreground">System-wide analytics and insights</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-muted-foreground">System-wide analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.overview.totalClicks.toLocaleString()}</div>
            <div className={`flex items-center text-xs ${getGrowthColor(analyticsData?.overview.clicksGrowth || 0)}`}>
              {getGrowthIcon(analyticsData?.overview.clicksGrowth || 0)}
              <span className="ml-1">{Math.abs(analyticsData?.overview.clicksGrowth || 0)}% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.overview.totalUsers.toLocaleString()}</div>
            <div className={`flex items-center text-xs ${getGrowthColor(analyticsData?.overview.usersGrowth || 0)}`}>
              {getGrowthIcon(analyticsData?.overview.usersGrowth || 0)}
              <span className="ml-1">{Math.abs(analyticsData?.overview.usersGrowth || 0)}% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.overview.totalLinks.toLocaleString()}</div>
            <div className={`flex items-center text-xs ${getGrowthColor(analyticsData?.overview.linksGrowth || 0)}`}>
              {getGrowthIcon(analyticsData?.overview.linksGrowth || 0)}
              <span className="ml-1">{Math.abs(analyticsData?.overview.linksGrowth || 0)}% from last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Clicks Over Time */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Activity Over Time</CardTitle>
                <CardDescription>Clicks, users, and links created over time</CardDescription>
              </div>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                clicks: {
                  label: "Clicks",
                  color: "hsl(var(--chart-1))",
                },
                users: {
                  label: "Users",
                  color: "hsl(var(--chart-2))",
                },
                links: {
                  label: "Links",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "line" && (
                  <LineChart data={analyticsData?.clicksOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="clicks" stroke="var(--color-clicks)" strokeWidth={2} />
                    <Line type="monotone" dataKey="users" stroke="var(--color-users)" strokeWidth={2} />
                    <Line type="monotone" dataKey="links" stroke="var(--color-links)" strokeWidth={2} />
                  </LineChart>
                )}
                {chartType === "area" && (
                  <AreaChart data={analyticsData?.clicksOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      stackId="1"
                      stroke="var(--color-clicks)"
                      fill="var(--color-clicks)"
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stackId="1"
                      stroke="var(--color-users)"
                      fill="var(--color-users)"
                    />
                    <Area
                      type="monotone"
                      dataKey="links"
                      stackId="1"
                      stroke="var(--color-links)"
                      fill="var(--color-links)"
                    />
                  </AreaChart>
                )}
                {chartType === "bar" && (
                  <BarChart data={analyticsData?.clicksOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="clicks" fill="var(--color-clicks)" />
                    <Bar dataKey="users" fill="var(--color-users)" />
                    <Bar dataKey="links" fill="var(--color-links)" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Device Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Device Types
            </CardTitle>
            <CardDescription>Clicks by device type</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Clicks",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData?.deviceStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {analyticsData?.deviceStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              {analyticsData?.deviceStats.map((device, index) => (
                <div key={device.device} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span>{device.device}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{device.count.toLocaleString()}</span>
                    <Badge variant="secondary">{device.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Browser Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Browser Usage
            </CardTitle>
            <CardDescription>Clicks by browser</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData?.browserStats.map((browser, index) => (
                <div key={browser.browser} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{browser.browser}</span>
                    <div className="flex items-center gap-2">
                      <span>{browser.count.toLocaleString()}</span>
                      <Badge variant="outline">{browser.percentage}%</Badge>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${browser.percentage}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Revenue Over Time
            </CardTitle>
            <CardDescription>Revenue and subscriptions (ETB)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--chart-1))",
                },
                subscriptions: {
                  label: "Subscriptions",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData?.revenueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fill="var(--color-revenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Top Countries
            </CardTitle>
            <CardDescription>Clicks by country</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData?.countryStats.map((country, index) => (
                <div key={country.country} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-4 bg-muted rounded-sm flex items-center justify-center text-xs">
                      {country.country.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{country.country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{country.count.toLocaleString()}</span>
                    <Badge variant="outline">{country.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Links Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Links</CardTitle>
          <CardDescription>Links with the most clicks</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyticsData?.topLinks.map((link, index) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <Badge variant="outline">#{index + 1}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{link.title}</div>
                      <div className="text-sm text-muted-foreground font-mono">/{link.shortCode}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{link.user}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <BarChart3 className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{link.clicks.toLocaleString()}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
