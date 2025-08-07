'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Globe, Monitor, Smartphone, Tablet, Calendar, Download, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { linksApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

interface GlobalAnalytics {
  totalLinks: number;
  totalClicks: number;
  clicksThisMonth: number;
  clicksLastMonth: number;
  topLinks: Array<{
    id: string;
    title: string;
    shortCode: string;
    clicks: number;
  }>;
  clicksByDate: { [key: string]: number };
  clicksByCountry: { [key: string]: number };
  clicksByDevice: { [key: string]: number };
  clicksByBrowser: { [key: string]: number };
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<GlobalAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Get all user links
      const { links } = await linksApi.getAll({ limit: 1000 });
      
      // Calculate global analytics
      const totalClicks = links.reduce((sum, link) => sum + link.clickCount, 0);
      
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const clicksThisMonth = links
        .filter(link => new Date(link.createdAt) >= thisMonth)
        .reduce((sum, link) => sum + link.clickCount, 0);
      
      const clicksLastMonth = links
        .filter(link => {
          const created = new Date(link.createdAt);
          return created >= lastMonth && created < thisMonth;
        })
        .reduce((sum, link) => sum + link.clickCount, 0);

      const topLinks = links
        .sort((a, b) => b.clickCount - a.clickCount)
        .slice(0, 10)
        .map(link => ({
          id: link.id,
          title: link.title || 'Untitled',
          shortCode: link.shortCode,
          clicks: link.clickCount
        }));

      // For demo purposes, generate some sample analytics data
      const clicksByDate: { [key: string]: number } = {};
      const days = parseInt(timeRange);
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        clicksByDate[dateStr] = Math.floor(Math.random() * 50) + 10;
      }

      const clicksByCountry = {
        'United States': Math.floor(totalClicks * 0.4),
        'United Kingdom': Math.floor(totalClicks * 0.2),
        'Canada': Math.floor(totalClicks * 0.15),
        'Germany': Math.floor(totalClicks * 0.1),
        'France': Math.floor(totalClicks * 0.08),
        'Australia': Math.floor(totalClicks * 0.07),
      };

      const clicksByDevice = {
        'desktop': Math.floor(totalClicks * 0.6),
        'mobile': Math.floor(totalClicks * 0.35),
        'tablet': Math.floor(totalClicks * 0.05),
      };

      const clicksByBrowser = {
        'Chrome': Math.floor(totalClicks * 0.65),
        'Safari': Math.floor(totalClicks * 0.2),
        'Firefox': Math.floor(totalClicks * 0.1),
        'Edge': Math.floor(totalClicks * 0.05),
      };

      setAnalytics({
        totalLinks: links.length,
        totalClicks,
        clicksThisMonth,
        clicksLastMonth,
        topLinks,
        clicksByDate,
        clicksByCountry,
        clicksByDevice,
        clicksByBrowser,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Analytics Data</h2>
        <p className="text-gray-600">Create some links to start seeing analytics data.</p>
      </div>
    );
  }

  const growth = calculateGrowth(analytics.clicksThisMonth, analytics.clicksLastMonth);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive analytics for all your shortened links
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {(user?.tier === 'pro' || user?.tier === 'premium') && (
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalLinks}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalClicks}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.clicksThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {growth > 0 ? '+' : ''}{growth}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. per Link</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalLinks > 0 ? Math.round(analytics.totalClicks / analytics.totalLinks) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Clicks per link</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Clicks Over Time */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Clicks Over Time</CardTitle>
                <CardDescription>Daily click count for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(analytics.clicksByDate)
                    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                    .map(([date, clicks]) => (
                      <div key={date} className="flex items-center justify-between py-2">
                        <span className="text-sm">{new Date(date).toLocaleDateString()}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.max(10, (clicks / Math.max(...Object.values(analytics.clicksByDate))) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{clicks}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Links */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Links</CardTitle>
                <CardDescription>Your most clicked links</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topLinks.slice(0, 5).map((link, index) => (
                    <div key={link.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{link.title}</p>
                          <p className="text-xs text-muted-foreground font-mono">/{link.shortCode}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium">{link.clicks}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Device Types */}
            <Card>
              <CardHeader>
                <CardTitle>Device Types</CardTitle>
                <CardDescription>Clicks by device type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.clicksByDevice)
                    .sort(([,a], [,b]) => b - a)
                    .map(([device, clicks]) => (
                      <div key={device} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getDeviceIcon(device)}
                          <span className="text-sm capitalize">{device}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ 
                                width: `${(clicks / analytics.totalClicks) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{clicks}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Countries */}
            <Card>
              <CardHeader>
                <CardTitle>Top Countries</CardTitle>
                <CardDescription>Clicks by country</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.clicksByCountry)
                    .sort(([,a], [,b]) => b - a)
                    .map(([country, clicks]) => (
                      <div key={country} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{country}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full" 
                              style={{ 
                                width: `${(clicks / analytics.totalClicks) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{clicks}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Browsers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Browsers</CardTitle>
                <CardDescription>Clicks by browser</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.clicksByBrowser)
                    .sort(([,a], [,b]) => b - a)
                    .map(([browser, clicks]) => (
                      <div key={browser} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{browser}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-600 h-2 rounded-full" 
                              style={{ 
                                width: `${(clicks / analytics.totalClicks) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{clicks}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audience" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
                <CardDescription>Where your audience is located</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(analytics.clicksByCountry)
                    .sort(([,a], [,b]) => b - a)
                    .map(([country, clicks]) => (
                      <div key={country} className="flex justify-between text-sm">
                        <span>{country}</span>
                        <span className="font-medium">
                          {Math.round((clicks / analytics.totalClicks) * 100)}%
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Preferences</CardTitle>
                <CardDescription>How users access your links</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(analytics.clicksByDevice)
                    .sort(([,a], [,b]) => b - a)
                    .map(([device, clicks]) => (
                      <div key={device} className="flex justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          {getDeviceIcon(device)}
                          <span className="capitalize">{device}</span>
                        </div>
                        <span className="font-medium">
                          {Math.round((clicks / analytics.totalClicks) * 100)}%
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Browser Usage</CardTitle>
                <CardDescription>Popular browsers among your audience</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(analytics.clicksByBrowser)
                    .sort(([,a], [,b]) => b - a)
                    .map(([browser, clicks]) => (
                      <div key={browser} className="flex justify-between text-sm">
                        <span>{browser}</span>
                        <span className="font-medium">
                          {Math.round((clicks / analytics.totalClicks) * 100)}%
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
