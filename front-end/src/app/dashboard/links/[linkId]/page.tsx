'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Copy, ExternalLink, Edit, Save, Calendar, BarChart3, Globe, Smartphone, Monitor, Tablet, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { linksApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

interface LinkData {
  id: string;
  shortCode: string;
  originalUrl: string;
  title: string | null;
  clickCount: number;
  createdAt: string;
  isActive: boolean;
  expiresAt: string | null;
}

interface AnalyticsData {
  clicksByDate: { [key: string]: number };
  clicksByCountry: { [key: string]: number };
  clicksByDevice: { [key: string]: number };
  clicksByBrowser: { [key: string]: number };
  clicksByReferrer: { [key: string]: number };
  
  clicksByReferrerPath?: { [key: string]: number };
  clicksByHour?: { [key: string]: number };
  totalClicks: number;
}

export default function LinkDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const linkId = params.linkId as string;

  const [link, setLink] = useState<LinkData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editShortCode, setEditShortCode] = useState('');

  useEffect(() => {
    fetchLinkData();
  }, [linkId]);

  useEffect(() => {
    if (link) {
      fetchAnalytics();
    }
  }, [link]);

  const fetchLinkData = async () => {
    try {
      const linkData = await linksApi.getById(linkId);
      setLink(linkData);
      setEditTitle(linkData.title || '');
      setEditIsActive(linkData.isActive);
      setEditExpiresAt(linkData.expiresAt ? new Date(linkData.expiresAt).toISOString().slice(0, 16) : '');
      setEditShortCode(linkData.shortCode || '');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load link",
        variant: "destructive",
      });
      router.push('/dashboard/links');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const analyticsData = await linksApi.getAnalytics(linkId, 30);
      setAnalytics(analyticsData);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!link) return;

    setIsSaving(true);
    try {
      await linksApi.update(linkId, {
        title: editTitle.trim() || "",
        isActive: editIsActive,
        expiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
        ...(user?.tier === 'premium' && editShortCode.trim() && editShortCode.trim() !== link.shortCode ? { shortCode: editShortCode.trim() } : {}),
      });

      setLink({
        ...link,
        title: editTitle.trim() || null,
        isActive: editIsActive,
        expiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
        shortCode: editShortCode.trim() || link.shortCode,
      });

      setIsEditing(false);
      toast({
        title: "Success",
        description: "Link updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update link",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getShortUrl = (shortCode: string) => {
    return `${window.location.origin}/${shortCode}`;
  };

  const isExpired = (expiresAt: string | null) => {
    return expiresAt && new Date(expiresAt) < new Date();
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Link not found</h2>
        <p className="text-gray-600 mb-6">The link you're looking for doesn't exist or has been deleted.</p>
        <Link href="/dashboard/links">
          <Button>Back to Links</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/links">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Links
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {link.title || 'Untitled Link'}
            </h1>
            <p className="text-gray-600 mt-1">
              Created {formatDate(link.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Link Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Link Information</CardTitle>
              <CardDescription>
                Basic information about your shortened link
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Short URL</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input
                        value={getShortUrl(link.shortCode)}
                        readOnly
                        className="font-mono"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(getShortUrl(link.shortCode))}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(getShortUrl(link.shortCode), '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Original URL</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input
                        value={link.originalUrl}
                        readOnly
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(link.originalUrl)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      {link.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {isExpired(link.expiresAt) && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Total Clicks</Label>
                    <div className="text-2xl font-bold mt-1">{link.clickCount}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {analytics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalClicks}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Countries</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.keys(analytics.clicksByCountry).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Unique countries</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Device</CardTitle>
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.keys(analytics.clicksByDevice).length > 0
                      ? Object.entries(analytics.clicksByDevice)
                          .sort(([,a], [,b]) => b - a)[0][0]
                      : 'N/A'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">Most used device</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Browser</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.keys(analytics.clicksByBrowser).length > 0
                      ? Object.entries(analytics.clicksByBrowser)
                          .sort(([,a], [,b]) => b - a)[0][0]
                      : 'N/A'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">Most used browser</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Clicks by Date */}
              <Card>
                <CardHeader>
                  <CardTitle>Clicks Over Time</CardTitle>
                  <CardDescription>Daily click count for the last 30 days</CardDescription>
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

              <div className="grid gap-6 md:grid-cols-2">
                {/* Countries */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Countries</CardTitle>
                    <CardDescription>Clicks by country</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.clicksByCountry)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 10)
                        .map(([country, clicks]) => (
                          <div key={country} className="flex items-center justify-between py-2">
                            <span className="text-sm">{country || 'Unknown'}</span>
                            <span className="text-sm font-medium">{clicks}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>



                {/* Devices */}
                <Card>
                  <CardHeader>
                    <CardTitle>Device Types</CardTitle>
                    <CardDescription>Clicks by device type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.clicksByDevice)
                        .sort(([,a], [,b]) => b - a)
                        .map(([device, clicks]) => (
                          <div key={device} className="flex items-center justify-between py-2">
                            <div className="flex items-center space-x-2">
                              {getDeviceIcon(device)}
                              <span className="text-sm capitalize">{device}</span>
                            </div>
                            <span className="text-sm font-medium">{clicks}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Referrer paths (Premium) */}
                {user?.tier === 'premium' && analytics.clicksByReferrerPath && Object.keys(analytics.clicksByReferrerPath).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Referrer Paths</CardTitle>
                      <CardDescription>Top referring hostnames and paths</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(analytics.clicksByReferrerPath)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 10)
                          .map(([path, clicks]) => (
                            <div key={path} className="flex items-center justify-between py-2">
                              <span className="text-sm truncate max-w-[220px]">{path}</span>
                              <span className="text-sm font-medium">{clicks}</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Browsers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Browsers</CardTitle>
                    <CardDescription>Clicks by browser</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.clicksByBrowser)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 10)
                        .map(([browser, clicks]) => (
                          <div key={browser} className="flex items-center justify-between py-2">
                            <span className="text-sm">{browser}</span>
                            <span className="text-sm font-medium">{clicks}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Referrers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Referrers</CardTitle>
                    <CardDescription>Traffic sources</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.clicksByReferrer)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 10)
                        .map(([referrer, clicks]) => (
                          <div key={referrer} className="flex items-center justify-between py-2">
                            <span className="text-sm truncate">{referrer || 'Direct'}</span>
                            <span className="text-sm font-medium">{clicks}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Hourly breakdown (Premium) */}
                {user?.tier === 'premium' && analytics.clicksByHour && Object.keys(analytics.clicksByHour).length > 0 && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Hourly Clicks</CardTitle>
                      <CardDescription>Time-based breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(analytics.clicksByHour)
                          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                          .map(([hour, clicks]) => (
                            <div key={hour} className="flex items-center justify-between py-2">
                              <span className="text-sm">{new Date(hour).toLocaleString()}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-indigo-600 h-2 rounded-full"
                                    style={{ width: `${Math.max(10, (clicks / Math.max(...Object.values(analytics.clicksByHour!))) * 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium w-8 text-right">{clicks}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
                <p className="text-gray-600">
                  Analytics data will appear here once your link receives clicks.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Link Settings</CardTitle>
              <CardDescription>
                Configure your link settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Enter a title for your link"
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-active"
                    checked={editIsActive}
                    onCheckedChange={setEditIsActive}
                    disabled={!isEditing}
                  />
                  <Label htmlFor="edit-active">Link is active</Label>
                </div>

                {(user?.tier === 'pro' || user?.tier === 'premium') && (
                  <div>
                    <Label htmlFor="edit-expires">Expiration Date (Optional)</Label>
                    <Input
                      id="edit-expires"
                      type="datetime-local"
                      value={editExpiresAt}
                      onChange={(e) => setEditExpiresAt(e.target.value)}
                      disabled={!isEditing}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Leave empty for no expiration
                    </p>
                  </div>
                )}

                {user?.tier === 'premium' && (
                  <div>
                    <Label htmlFor="edit-shortcode">Custom Short Code</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-muted-foreground">/</span>
                      <Input
                        id="edit-shortcode"
                        value={editShortCode}
                        onChange={(e) => setEditShortCode(e.target.value)}
                        placeholder="my-brand-code"
                        disabled={!isEditing}
                        className="font-mono"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Must be unique. Letters, numbers, and dashes recommended.</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Link Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Short Code:</span>
                    <p className="font-mono">{link.shortCode}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p>{formatDate(link.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Clicks:</span>
                    <p>{link.clickCount}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="flex items-center space-x-1">
                      {link.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {isExpired(link.expiresAt) && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
