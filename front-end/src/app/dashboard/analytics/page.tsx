'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Globe, Monitor, Smartphone, Tablet, Calendar, Download, RefreshCw, Loader2, Lock, ArrowUpRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { globalAnalyticsApi } from '@/lib/api';
import { countryCodeToName } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent,
  ChartStyle
} from '@/components/ui/chart';
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface GlobalAnalytics {
  links: Array<{
    id: string;
    title: string | null;
    shortCode: string;
    clickCount: number;
    clicksInPeriod: number;
  }>;
  clicksByDate: { [key: string]: number };
  clicksByCountry: { [key: string]: number };
  clicksByDevice: { [key: string]: number };
  clicksByBrowser: { [key: string]: number };
  
  clicksByReferrerPath?: { [key: string]: number };
  clicksByHour?: { [key: string]: number };
  totalClicks: number;
  restrictions: {
    canSeeFullAnalytics: boolean;
    canSeeAdvancedCharts: boolean;
    topCountriesHidden: number;
    browsersHidden: boolean;
    devicesHidden: boolean;
  };
  usage: {
    visitorCap: { current: number; limit: number | null; percentage: number };
    newVisitorsSinceLastVisit: number;
  };
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<GlobalAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const { user } = useAuth();
  const { toast } = useToast();
  const [analyticsViewMode, setAnalyticsViewMode] = useState<'graphical' | 'standard'>('graphical');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await globalAnalyticsApi.getGlobalAnalytics(parseInt(timeRange));
      setAnalytics(data);
      
      // Show warning toast when 50% of visitor cap is reached
      if (data.usage.visitorCap && data.usage.visitorCap.percentage >= 50) {
        toast({
          title: "Usage Warning",
          description: `You've used ${data.usage.visitorCap.percentage}% of your visitor cap. Consider upgrading for unlimited tracking.`,
          variant: "destructive",
        });
      }
      
      // Show new visitors notification
      if (data.usage.newVisitorsSinceLastVisit > 0) {
        toast({
          title: "New Visitors!",
          description: `You have ${data.usage.newVisitorsSinceLastVisit} new visitors since your last visit.`,
        });
      }

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

  // Prepare data for advanced charts
  const prepareChartData = () => {
    if (!analytics) return { clicksByDate: [], clicksByCountry: [], clicksByDevice: [], clicksByBrowser: [] };

    const clicksByDate = Object.entries(analytics.clicksByDate || {})
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, clicks]) => ({ date: new Date(date).toLocaleDateString(), clicks }));

    const clicksByCountry = Object.entries(analytics.clicksByCountry || {})
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([country, clicks]) => ({ country: countryCodeToName(country), clicks }));

    const clicksByDevice = Object.entries(analytics.clicksByDevice || {})
      .sort(([,a], [,b]) => b - a)
      .map(([device, clicks]) => ({ device, clicks }));

    const clicksByBrowser = Object.entries(analytics.clicksByBrowser || {})
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([browser, clicks]) => ({ browser, clicks }));

    return { clicksByDate, clicksByCountry, clicksByDevice, clicksByBrowser };
  };

  const downloadPDF = async () => {
    if (!analytics) {
      toast({
        title: "Error",
        description: "No analytics data available for PDF generation.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we generate your analytics report...",
      });

      // Create a temporary container for the PDF content
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.top = '0';
      pdfContainer.style.width = '800px';
      pdfContainer.style.backgroundColor = 'white';
      pdfContainer.style.padding = '20px';
      pdfContainer.style.fontFamily = 'Arial, sans-serif';
      pdfContainer.style.color = 'black';
      document.body.appendChild(pdfContainer);

      // Generate PDF content
      pdfContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin-bottom: 10px;">LinkShort Analytics Report</h1>
          <p style="color: #6b7280; font-size: 14px;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p style="color: #6b7280; font-size: 14px;">Time Period: Last ${timeRange} days</p>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Overview Statistics</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${totalLinks}</div>
              <div style="font-size: 12px; color: #6b7280;">Total Links</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">${totalClicks}</div>
              <div style="font-size: 12px; color: #6b7280;">Total Clicks</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${analytics && Object.keys(analytics.clicksByDate || {}).length > 0 ? Object.values(analytics.clicksByDate).reduce((sum, clicks) => sum + clicks, 0) : 0}</div>
              <div style="font-size: 12px; color: #6b7280;">Period Clicks</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">${avgPerLink}</div>
              <div style="font-size: 12px; color: #6b7280;">Avg. per Link</div>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Top Performing Links</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Rank</th>
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Title</th>
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Short Code</th>
                <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Clicks</th>
              </tr>
            </thead>
            <tbody>
              ${analytics.links
                .sort((a, b) => b.clickCount - a.clickCount)
                .slice(0, 10)
                .map((link, index) => `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${index + 1}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${link.title || 'Untitled'}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; font-family: monospace;">/${link.shortCode}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; text-align: right;">${link.clickCount}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>

        ${Object.keys(analytics.clicksByCountry).length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Geographic Distribution</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Country</th>
                <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Clicks</th>
                <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(analytics.clicksByCountry)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 15)
                .map(([country, clicks]) => `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${countryCodeToName(country)}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; text-align: right;">${clicks}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; text-align: right;">${analytics.totalClicks > 0 ? Math.round((clicks / analytics.totalClicks) * 100) : 0}%</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${Object.keys(analytics.clicksByDevice).length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Device Preferences</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Device Type</th>
                <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Clicks</th>
                <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(analytics.clicksByDevice)
                .sort(([,a], [,b]) => b - a)
                .map(([device, clicks]) => `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; text-transform: capitalize;">${device}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; text-align: right;">${clicks}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; text-align: right;">${analytics.totalClicks > 0 ? Math.round((clicks / analytics.totalClicks) * 100) : 0}%</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${Object.keys(analytics.clicksByBrowser).length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Browser Usage</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Browser</th>
                <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Clicks</th>
                <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(analytics.clicksByBrowser)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([browser, clicks]) => `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${browser}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; text-align: right;">${clicks}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; text-align: right;">${analytics.totalClicks > 0 ? Math.round((clicks / analytics.totalClicks) * 100) : 0}%</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Generated by LinkShort Analytics</p>
          <p>Your trusted URL shortening and analytics platform</p>
        </div>
      `;

      // Convert to canvas and then to PDF
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Clean up
      document.body.removeChild(pdfContainer);

      // Download the PDF
      pdf.save(`linkshort-analytics-${timeRange}days-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "PDF Downloaded!",
        description: "Your analytics report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 px-4">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">No Analytics Data</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">Create some links to start seeing analytics data.</p>
      </div>
    );
  }

  // Calculate derived values
  const totalLinks = analytics?.links?.length || 0;
  const totalClicks = analytics?.totalClicks || 0;
  const avgPerLink = totalLinks > 0 ? Math.round(totalClicks / totalLinks) : 0;
  const chartData = prepareChartData();

  return (
    <div className="space-y-4 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Comprehensive analytics for all your shortened links
          </p>
          {analytics.usage.newVisitorsSinceLastVisit > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                🎉 You have <strong>{analytics.usage.newVisitorsSinceLastVisit}</strong> new visitors since your last visit!
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-32 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics} className="w-full sm:w-auto text-sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {user?.tier === 'premium' && (
            <Button variant="outline" onClick={downloadPDF} className="w-full sm:w-auto text-sm">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          )}
        </div>
      </div>

      {/* Analytics View Toggle - Premium Only */}
      {user?.tier === 'premium' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analytics View</CardTitle>
            <CardDescription className="text-sm">Choose how to view your analytics data</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={analyticsViewMode} onValueChange={(value) => setAnalyticsViewMode(value as 'graphical' | 'standard')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="graphical" className="text-sm">Graphical View</TabsTrigger>
                <TabsTrigger value="standard" className="text-sm">Standard View</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analytics View</CardTitle>
            <CardDescription className="text-sm">Upgrade to Premium for graphical analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 p-4 border rounded-lg sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center space-x-4">
                <Lock className="h-8 w-8 text-gray-400 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-base">Graphical Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Visualize your data with charts and graphs
                  </p>
                </div>
              </div>
              <Link href="/dashboard/subscription" className="w-full sm:w-auto">
                <Button size="sm" className="w-full sm:w-auto text-sm">
                  Upgrade to Premium
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{totalLinks}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{totalClicks}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Period Clicks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
              {analytics ? Object.values(analytics.clicksByDate).reduce((sum, clicks) => sum + clicks, 0) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Last {timeRange} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. per Link</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{avgPerLink}</div>
            <p className="text-xs text-muted-foreground">Clicks per link</p>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Cap Warning */}
      {analytics && analytics.usage.visitorCap && analytics.usage.visitorCap.limit && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-orange-600 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-base text-orange-900 dark:text-orange-100">Visitor Cap Active</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    You're tracking visitors with a cap of {analytics.usage.visitorCap.limit.toLocaleString()}. 
                    Upgrade to Pro or Premium for higher limits.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/subscription" className="w-full sm:w-auto">
                <Button size="sm" className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-sm">
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Upgrade
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
          <TabsTrigger value="performance" className="text-sm">Performance</TabsTrigger>
          <TabsTrigger value="audience" className="text-sm">Audience</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {!analytics ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Loading Analytics</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Please wait while we fetch your analytics data...</p>
            </div>
          ) : (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Clicks Over Time */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl">Clicks Over Time</CardTitle>
                <CardDescription className="text-sm">Click trends over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {!analytics || Object.keys(analytics.clicksByDate).length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Data Available</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">No clicks recorded in the selected time period.</p>
                  </div>
                ) : (
                  <>
                    {user?.tier === 'premium' && analytics.restrictions.canSeeAdvancedCharts && analyticsViewMode === 'graphical' ? (
                      // Advanced Line Chart for Premium users
                      <div className="h-60 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData.clicksByDate}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      // Simple bar chart for all users
                      <div className="space-y-2">
                        {chartData.clicksByDate.map((item) => (
                          <div key={item.date} className="flex items-center justify-between py-2">
                            <span className="text-sm min-w-0 flex-1 pr-2">{item.date}</span>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <div className="w-20 sm:w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ 
                                    width: `${Math.max(10, chartData.clicksByDate.length > 0 ? (item.clicks / Math.max(...chartData.clicksByDate.map(d => d.clicks))) * 100 : 0)}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-12 text-right">{item.clicks}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Top Performing Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Top Performing Links</CardTitle>
                <CardDescription className="text-sm">Your most clicked links</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.links
                    .sort((a, b) => b.clickCount - a.clickCount)
                    .slice(0, 5)
                    .map((link, index) => (
                      <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{index + 1}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{link.title || 'Untitled'}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate">/{link.shortCode}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-sm font-medium">{link.clickCount}</p>
                          <p className="text-xs text-muted-foreground">clicks</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Geographic Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Geographic Distribution</CardTitle>
                <CardDescription className="text-sm">Clicks by country</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(analytics.clicksByCountry).length === 0 ? (
                  <div className="text-center py-8">
                    <Globe className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">No geographic data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(analytics.clicksByCountry)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([country, clicks]) => (
                        <div key={country} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <Globe className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm truncate">{countryCodeToName(country)}</span>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="text-sm font-medium">{clicks}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.round((clicks / analytics.totalClicks) * 100)}%
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Link Performance</CardTitle>
              <CardDescription className="text-sm">Detailed performance of your links</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.links
                  .sort((a, b) => b.clickCount - a.clickCount)
                  .map((link) => (
                    <div key={link.id} className="flex flex-col space-y-2 p-3 border rounded-lg sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-base truncate">{link.title || 'Untitled'}</h3>
                        <p className="text-xs text-muted-foreground font-mono truncate">/{link.shortCode}</p>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="text-center">
                          <p className="font-medium">{link.clickCount}</p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">{link.clicksInPeriod}</p>
                          <p className="text-xs text-muted-foreground">Period</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience" className="space-y-6">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Device Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Device Distribution</CardTitle>
                <CardDescription className="text-sm">Clicks by device type</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(analytics.clicksByDevice).length === 0 ? (
                  <div className="text-center py-8">
                    <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">No device data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(analytics.clicksByDevice)
                      .sort(([,a], [,b]) => b - a)
                      .map(([device, clicks]) => (
                        <div key={device} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            {getDeviceIcon(device)}
                            <span className="text-sm capitalize truncate">{device}</span>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="text-sm font-medium">{clicks}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.round((clicks / analytics.totalClicks) * 100)}%
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Browser Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Browser Distribution</CardTitle>
                <CardDescription className="text-sm">Clicks by browser</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(analytics.clicksByBrowser).length === 0 ? (
                  <div className="text-center py-8">
                    <Globe className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">No browser data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(analytics.clicksByBrowser)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 8)
                      .map(([browser, clicks]) => (
                        <div key={browser} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <Globe className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm truncate">{browser}</span>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="text-sm font-medium">{clicks}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.round((clicks / analytics.totalClicks) * 100)}%
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
