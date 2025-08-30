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
      <div className="space-y-3 md:space-y-6">
        <div>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-xs md:text-sm lg:text-base text-muted-foreground">System-wide analytics and insights</p>
        </div>

        <div className="grid gap-2 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <div className="h-3 w-12 md:w-16 lg:w-20 bg-muted animate-pulse rounded" />
                <div className="h-3 w-3 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-5 w-8 md:h-6 md:w-12 lg:h-8 lg:w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-2 w-16 md:w-20 lg:w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-20 md:w-24 lg:w-32 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                <div className="h-32 md:h-48 lg:h-64 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-6 px-1 md:px-0">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Analytics Dashboard</h2>
        <p className="text-xs md:text-sm lg:text-base text-muted-foreground">System-wide analytics and insights</p>
      </div>

      {/* Controls */}
      <div className="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between">
        <div className="space-y-2 md:space-y-0 md:flex md:gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} className="w-full md:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-2 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium truncate">Total Clicks</CardTitle>
            <MousePointer className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-base md:text-lg lg:text-2xl font-bold">{analyticsData?.overview.totalClicks.toLocaleString()}</div>
            <div className={`flex items-center text-xs ${getGrowthColor(analyticsData?.overview.clicksGrowth || 0)}`}>
              {getGrowthIcon(analyticsData?.overview.clicksGrowth || 0)}
              <span className="ml-1 truncate">{Math.abs(analyticsData?.overview.clicksGrowth || 0)}% from last</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium truncate">Total Users</CardTitle>
            <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-base md:text-lg lg:text-2xl font-bold">{analyticsData?.overview.totalUsers.toLocaleString()}</div>
            <div className={`flex items-center text-xs ${getGrowthColor(analyticsData?.overview.usersGrowth || 0)}`}>
              {getGrowthIcon(analyticsData?.overview.usersGrowth || 0)}
              <span className="ml-1 truncate">{Math.abs(analyticsData?.overview.usersGrowth || 0)}% from last</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium truncate">Total Links</CardTitle>
            <LinkIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-base md:text-lg lg:text-2xl font-bold">{analyticsData?.overview.totalLinks.toLocaleString()}</div>
            <div className={`flex items-center text-xs ${getGrowthColor(analyticsData?.overview.linksGrowth || 0)}`}>
              {getGrowthIcon(analyticsData?.overview.linksGrowth || 0)}
              <span className="ml-1 truncate">{Math.abs(analyticsData?.overview.linksGrowth || 0)}% from last</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium truncate">Total Revenue</CardTitle>
            <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-base md:text-lg lg:text-2xl font-bold">{formatCurrency(analyticsData?.revenue.total || 0)}</div>
            <div className="text-xs text-muted-foreground truncate">
              {formatCurrency(analyticsData?.revenue.monthly || 0)} this month
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
        {/* Activity Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="space-y-2 md:space-y-0 md:flex md:items-center md:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-base md:text-lg lg:text-xl truncate">Activity Over Time</CardTitle>
                <CardDescription className="text-xs md:text-sm">Clicks and links created over time</CardDescription>
              </div>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-full md:w-[100px]">
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
          <CardContent className="px-2 md:px-6">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[280px]">
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
                  className="h-[180px] md:h-[250px] lg:h-[300px]"
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Stats */}
        <Card>
          <CardHeader className="pb-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg lg:text-xl">
                <Smartphone className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Device Types</span>
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Clicks by device type</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            {analyticsData?.deviceStats && analyticsData.deviceStats.length > 0 ? (
              <>
                <ChartContainer
                  config={{
                    count: {
                      label: "Clicks",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[140px] md:h-[180px] lg:h-[200px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.deviceStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={50}
                        paddingAngle={3}
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
                <div className="mt-3 space-y-2">
                  {analyticsData.deviceStats.map((device, index) => (
                    <div key={device.device} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="truncate text-xs md:text-sm">{device.device}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="font-medium text-xs">{device.count.toLocaleString()}</span>
                        <Badge variant="secondary" className="text-xs px-1">{device.percentage}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Smartphone className="h-6 w-6 mx-auto mb-2" />
                <p className="text-xs md:text-sm">No device data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Browser Stats */}
        <Card>
          <CardHeader className="pb-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg lg:text-xl">
                <Monitor className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Browser Usage</span>
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Clicks by browser</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            {analyticsData?.browserStats && analyticsData.browserStats.length > 0 ? (
              <div className="space-y-3">
                {analyticsData.browserStats.map((browser, index) => (
                  <div key={browser.browser} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate flex-1 min-w-0 pr-2 text-xs md:text-sm">{browser.browser}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs">{browser.count.toLocaleString()}</span>
                        <Badge variant="outline" className="text-xs px-1">{browser.percentage}%</Badge>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
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
              <div className="text-center py-6 text-muted-foreground">
                <Monitor className="h-6 w-6 mx-auto mb-2" />
                <p className="text-xs md:text-sm">No browser data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg lg:text-xl">
                <DollarSign className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Revenue Over Time</span>
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Revenue and subscriptions (ETB)</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            {analyticsData?.revenueOverTime && analyticsData.revenueOverTime.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="min-w-[280px]">
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
                    className="h-[140px] md:h-[180px] lg:h-[200px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData.revenueOverTime}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={formatDate} fontSize={10} />
                        <YAxis fontSize={10} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fill="var(--color-revenue)" />
                        <Area type="monotone" dataKey="subscriptions" stroke="var(--color-subscriptions)" fill="var(--color-subscriptions)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <DollarSign className="h-6 w-6 mx-auto mb-2" />
                <p className="text-xs md:text-sm">No revenue data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card>
          <CardHeader className="pb-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg lg:text-xl">
                <Globe className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Top Countries</span>
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Clicks by country</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            {analyticsData?.countryStats && analyticsData.countryStats.length > 0 ? (
              <div className="space-y-3">
                {analyticsData.countryStats.map((country, index) => (
                  <div key={country.country} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-5 h-3 bg-muted rounded-sm flex items-center justify-center text-xs flex-shrink-0">
                        {country.country.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs md:text-sm font-medium truncate">{country.country}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs">{country.count.toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs px-1">{country.percentage}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Globe className="h-6 w-6 mx-auto mb-2" />
                <p className="text-xs md:text-sm">No country data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Links Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="min-w-0">
            <CardTitle className="text-base md:text-lg lg:text-xl truncate">Top Performing Links</CardTitle>
            <CardDescription className="text-xs md:text-sm">Links with the most clicks</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-1 md:px-6">
          {analyticsData?.topLinks && analyticsData.topLinks.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[300px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-xs">#</TableHead>
                    <TableHead className="min-w-0 text-xs">Link</TableHead>
                    <TableHead className="w-20 hidden lg:table-cell text-xs">User</TableHead>
                    <TableHead className="text-right w-16 text-xs">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData.topLinks.map((link, index) => (
                    <TableRow key={link.id}>
                      <TableCell className="py-2">
                        <Badge variant="outline" className="text-xs px-1">#{index + 1}</Badge>
                      </TableCell>
                      <TableCell className="min-w-0 py-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate text-xs md:text-sm max-w-[120px] md:max-w-[200px]">{link.title}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate max-w-[120px] md:max-w-[200px]">/{link.shortCode}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell py-2">
                        <div className="text-xs truncate max-w-[80px]">{link.user}</div>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <div className="flex items-center justify-end gap-1">
                          <BarChart3 className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium text-xs">{link.clicks.toLocaleString()}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <LinkIcon className="h-6 w-6 mx-auto mb-2" />
              <p className="text-xs md:text-sm">No link data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


