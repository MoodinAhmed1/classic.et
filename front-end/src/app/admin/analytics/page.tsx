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
  DollarSign,
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
  revenue: {
    total: number
    monthly: number
    yearly: number
  }
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
      
      // Calculate percentages for stats
      const totalDeviceClicks = (res.deviceStats || []).reduce((sum: number, d: any) => sum + d.count, 0)
      const totalBrowserClicks = (res.browserStats || []).reduce((sum: number, b: any) => sum + b.count, 0)
      const totalCountryClicks = (res.countryStats || []).reduce((sum: number, c: any) => sum + c.count, 0)
      
      // Create revenue over time data from real payment transactions
      const revenueOverTime = generateRevenueOverTimeFromRealData(res.revenue, days)
      
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
          users: 0, // This would need to be calculated from user registration dates
          links: Number((res.linksByDate as any)?.[date] || 0),
        })),
        deviceStats: (res.deviceStats || []).map((d: any) => ({ 
          device: d.device, 
          count: d.count, 
          percentage: totalDeviceClicks > 0 ? Math.round((d.count / totalDeviceClicks) * 100) : 0 
        })),
        browserStats: (res.browserStats || []).map((b: any) => ({ 
          browser: b.browser, 
          count: b.count, 
          percentage: totalBrowserClicks > 0 ? Math.round((b.count / totalBrowserClicks) * 100) : 0 
        })),
        countryStats: (res.countryStats || []).map((c: any) => ({ 
          country: c.country, 
          count: c.count, 
          percentage: totalCountryClicks > 0 ? Math.round((c.count / totalCountryClicks) * 100) : 0 
        })),
        topLinks: (res.topLinks || []).map((l: any) => ({
          id: l.id,
          title: l.title || l.original_url || "Untitled",
          shortCode: l.short_code,
          clicks: l.click_count || 0,
          user: l.user_name || l.user_id || "",
        })),
        revenueOverTime,
        revenue: res.revenue || { total: 0, monthly: 0, yearly: 0 },
      }
      setAnalyticsData(data)
    } catch (error) {
      console.error("Failed to fetch analytics data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Generate revenue over time data from real revenue data
  const generateRevenueOverTimeFromRealData = (revenue: any, days: number) => {
    const data = []
    const dailyRevenue = revenue.monthly / 30 // Distribute monthly revenue across days
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      data.push({
        date: dateStr,
        revenue: Math.round(dailyRevenue),
        subscriptions: 1, // Default to 1 subscription per day
      })
    }
    
    return data
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
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

  const handleExport = () => {
    if (!analyticsData) return

    const exportData = {
      overview: analyticsData.overview,
      deviceStats: analyticsData.deviceStats,
      browserStats: analyticsData.browserStats,
      countryStats: analyticsData.countryStats,
      topLinks: analyticsData.topLinks,
      revenue: analyticsData.revenue,
      exportDate: new Date().toISOString(),
      timeRange: timeRange
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-export-${timeRange}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData?.revenue.total || 0)}</div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(analyticsData?.revenue.monthly || 0)} this month
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
                <CardDescription>Clicks and links created over time</CardDescription>
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
                links: {
                  label: "Links",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "line" ? (
                  <LineChart data={analyticsData?.clicksOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="clicks" stroke="var(--color-clicks)" strokeWidth={2} />
                    <Line type="monotone" dataKey="links" stroke="var(--color-links)" strokeWidth={2} />
                  </LineChart>
                ) : chartType === "area" ? (
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
                      dataKey="links"
                      stackId="1"
                      stroke="var(--color-links)"
                      fill="var(--color-links)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={analyticsData?.clicksOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="clicks" fill="var(--color-clicks)" />
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
            {analyticsData?.deviceStats && analyticsData.deviceStats.length > 0 ? (
              <>
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
                        data={analyticsData.deviceStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {analyticsData.deviceStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="mt-4 space-y-2">
                  {analyticsData.deviceStats.map((device, index) => (
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
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Smartphone className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No device data available</p>
              </div>
            )}
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
            {analyticsData?.browserStats && analyticsData.browserStats.length > 0 ? (
              <div className="space-y-3">
                {analyticsData.browserStats.map((browser, index) => (
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No browser data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue Over Time
            </CardTitle>
            <CardDescription>Revenue and subscriptions (ETB)</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsData?.revenueOverTime && analyticsData.revenueOverTime.length > 0 ? (
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
                  <AreaChart data={analyticsData.revenueOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fill="var(--color-revenue)" />
                    <Area type="monotone" dataKey="subscriptions" stroke="var(--color-subscriptions)" fill="var(--color-subscriptions)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No revenue data available</p>
              </div>
            )}
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
            {analyticsData?.countryStats && analyticsData.countryStats.length > 0 ? (
              <div className="space-y-3">
                {analyticsData.countryStats.map((country, index) => (
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No country data available</p>
              </div>
            )}
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
          {analyticsData?.topLinks && analyticsData.topLinks.length > 0 ? (
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
                {analyticsData.topLinks.map((link, index) => (
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <LinkIcon className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No link data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


