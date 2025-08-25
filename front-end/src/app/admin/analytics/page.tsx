"use client"

import { useState, useEffect } from "react"
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
      // Mock data for now - replace with actual API call
      const mockData: AnalyticsData = {
        overview: {
          totalClicks: 45672,
          totalUsers: 1247,
          totalLinks: 8934,
          clicksGrowth: 23.5,
          usersGrowth: 12.3,
          linksGrowth: 8.7,
        },
        clicksOverTime: [
          { date: "2024-01-01", clicks: 1200, users: 45, links: 23 },
          { date: "2024-01-02", clicks: 1350, users: 52, links: 28 },
          { date: "2024-01-03", clicks: 1180, users: 48, links: 25 },
          { date: "2024-01-04", clicks: 1420, users: 58, links: 32 },
          { date: "2024-01-05", clicks: 1680, users: 65, links: 38 },
          { date: "2024-01-06", clicks: 1890, users: 72, links: 42 },
          { date: "2024-01-07", clicks: 2100, users: 78, links: 45 },
          { date: "2024-01-08", clicks: 1950, users: 74, links: 41 },
          { date: "2024-01-09", clicks: 2250, users: 85, links: 48 },
          { date: "2024-01-10", clicks: 2400, users: 92, links: 52 },
          { date: "2024-01-11", clicks: 2180, users: 88, links: 49 },
          { date: "2024-01-12", clicks: 2350, users: 95, links: 54 },
          { date: "2024-01-13", clicks: 2500, users: 98, links: 58 },
          { date: "2024-01-14", clicks: 2650, users: 102, links: 61 },
        ],
        deviceStats: [
          { device: "Desktop", count: 18500, percentage: 40.5 },
          { device: "Mobile", count: 22100, percentage: 48.4 },
          { device: "Tablet", count: 5072, percentage: 11.1 },
        ],
        browserStats: [
          { browser: "Chrome", count: 25600, percentage: 56.1 },
          { browser: "Safari", count: 9800, percentage: 21.5 },
          { browser: "Firefox", count: 5400, percentage: 11.8 },
          { browser: "Edge", count: 3200, percentage: 7.0 },
          { browser: "Other", count: 1672, percentage: 3.6 },
        ],
        countryStats: [
          { country: "Ethiopia", count: 15200, percentage: 33.3 },
          { country: "United States", count: 8900, percentage: 19.5 },
          { country: "United Kingdom", count: 4500, percentage: 9.9 },
          { country: "Germany", count: 3800, percentage: 8.3 },
          { country: "Canada", count: 2900, percentage: 6.4 },
          { country: "Other", count: 10372, percentage: 22.6 },
        ],
        topLinks: [
          { id: "1", title: "YouTube Video", shortCode: "yt999", clicks: 1567, user: "John Doe" },
          { id: "2", title: "GitHub Repository", shortCode: "gh456", clicks: 1245, user: "Jane Smith" },
          { id: "3", title: "Documentation", shortCode: "docs123", clicks: 987, user: "Bob Wilson" },
          { id: "4", title: "Product Demo", shortCode: "demo789", clicks: 856, user: "Alice Brown" },
          { id: "5", title: "Blog Post", shortCode: "blog456", clicks: 743, user: "Charlie Davis" },
        ],
        revenueOverTime: [
          { date: "2024-01-01", revenue: 850, subscriptions: 12 },
          { date: "2024-01-02", revenue: 920, subscriptions: 15 },
          { date: "2024-01-03", revenue: 780, subscriptions: 11 },
          { date: "2024-01-04", revenue: 1100, subscriptions: 18 },
          { date: "2024-01-05", revenue: 1250, subscriptions: 22 },
          { date: "2024-01-06", revenue: 1400, subscriptions: 25 },
          { date: "2024-01-07", revenue: 1650, subscriptions: 28 },
          { date: "2024-01-08", revenue: 1520, subscriptions: 26 },
          { date: "2024-01-09", revenue: 1800, subscriptions: 32 },
          { date: "2024-01-10", revenue: 1950, subscriptions: 35 },
          { date: "2024-01-11", revenue: 1720, subscriptions: 31 },
          { date: "2024-01-12", revenue: 2100, subscriptions: 38 },
          { date: "2024-01-13", revenue: 2250, subscriptions: 42 },
          { date: "2024-01-14", revenue: 2400, subscriptions: 45 },
        ],
      }
      setAnalyticsData(mockData)
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
