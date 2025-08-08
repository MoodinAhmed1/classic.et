'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { User, Mail, Shield, Bell, Globe, Key, Trash2, Save, Loader2, Crown, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/api';

// Email validation function
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  
  // Profile settings - initialize with current user data
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  // Update form fields when user data changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Security settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [isNotificationsSaving, setIsNotificationsSaving] = useState(false);

  // API settings
  const [apiKey, setApiKey] = useState('sk_live_1234567890abcdef...');
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);

  const handleProfileSave = async () => {
    // Validate email format
    if (email && !isValidEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsProfileSaving(true);
    try {
      // Use the cookie-based API
      const response = await authApi.updateProfile({
        name: name.trim(),
        email: email.trim(),
      });

      // Update the user in the auth context
      if (updateUser && response.user) {
        updateUser(response.user);
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsPasswordSaving(true);
    try {
      // Use the cookie-based API
      await authApi.updatePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password. Please check your current password.",
        variant: "destructive",
      });
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleNotificationsSave = async () => {
    setIsNotificationsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Notifications updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notifications.",
        variant: "destructive",
      });
    } finally {
      setIsNotificationsSaving(false);
    }
  };

  const generateNewApiKey = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newKey = 'sk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setApiKey(newKey);
      
      toast({
        title: "API key generated",
        description: "A new API key has been generated. Make sure to update your applications.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate new API key.",
        variant: "destructive",
      });
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'premium': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'premium': return <Crown className="h-4 w-4" />;
      case 'pro': return <Zap className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">{user?.name || user?.email}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={getTierColor(user?.tier || 'free')}>
                      <div className="flex items-center space-x-1">
                        {getTierIcon(user?.tier || 'free')}
                        <span>{user?.tier?.toUpperCase() || 'FREE'}</span>
                      </div>
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a bit about yourself"
                  rows={3}
                />
              </div>

              <Button onClick={handleProfileSave} disabled={isProfileSaving}>
                {isProfileSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                />
              </div>

              <Button onClick={handlePasswordSave} disabled={isPasswordSaving}>
                {isPasswordSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Shield className="mr-2 h-4 w-4" />
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">
                    Secure your account with 2FA via authenticator app
                  </p>
                </div>
                <Button variant="outline">
                  <Key className="mr-2 h-4 w-4" />
                  Enable 2FA
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about your account activity
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Marketing Emails</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive emails about new features and promotions
                    </p>
                  </div>
                  <Switch
                    checked={marketingEmails}
                    onCheckedChange={setMarketingEmails}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Weekly Reports</h4>
                    <p className="text-sm text-muted-foreground">
                      Get weekly analytics reports via email
                    </p>
                  </div>
                  <Switch
                    checked={weeklyReports}
                    onCheckedChange={setWeeklyReports}
                  />
                </div>
              </div>

              <Button onClick={handleNotificationsSave} disabled={isNotificationsSaving}>
                {isNotificationsSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Bell className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          {user?.tier === 'free' ? (
            <Card>
              <CardContent className="text-center py-12">
                <Key className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">API Access</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  API access is available for Pro and Premium users only.
                </p>
                <Button>
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Pro
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>
                  Manage your API keys and access tokens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={isApiKeyVisible ? apiKey : '••••••••••••••••••••••••••••••••'}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setIsApiKeyVisible(!isApiKeyVisible)}
                    >
                      {isApiKeyVisible ? 'Hide' : 'Show'}
                    </Button>
                    <Button variant="outline" onClick={generateNewApiKey}>
                      Regenerate
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Keep your API key secure and don't share it publicly.
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">API Documentation</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Learn how to integrate with our API to programmatically manage your links.
                  </p>
                  <Button variant="outline">
                    <Globe className="mr-2 h-4 w-4" />
                    View Documentation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Manage your subscription and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    {getTierIcon(user?.tier || 'free')}
                  </div>
                  <div>
                    <h3 className="font-medium">{user?.tier?.toUpperCase() || 'FREE'} Plan</h3>
                    <p className="text-sm text-muted-foreground">
                      {user?.tier === 'free' && 'Basic features with limited usage'}
                      {user?.tier === 'pro' && 'Advanced features with higher limits'}
                      {user?.tier === 'premium' && 'All features with unlimited usage'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {user?.tier === 'free' && '$0/month'}
                    {user?.tier === 'pro' && '$9/month'}
                    {user?.tier === 'premium' && '$29/month'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user?.tier === 'free' ? 'Free forever' : 'Billed monthly'}
                  </p>
                </div>
              </div>

              {user?.tier === 'free' && (
                <div className="space-y-4">
                  <h4 className="font-medium">Upgrade Your Plan</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Zap className="h-5 w-5 text-blue-600" />
                          <span>Pro Plan</span>
                        </CardTitle>
                        <CardDescription>Perfect for growing businesses</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-2">$9<span className="text-sm font-normal">/month</span></div>
                        <ul className="text-sm space-y-1 mb-4">
                          <li>✓ 1,000 links per month</li>
                          <li>✓ Custom short codes</li>
                          <li>✓ Advanced analytics</li>
                          <li>✓ Link expiration</li>
                        </ul>
                        <Button className="w-full">Upgrade to Pro</Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Crown className="h-5 w-5 text-purple-600" />
                          <span>Premium Plan</span>
                        </CardTitle>
                        <CardDescription>For enterprises and power users</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-2">$29<span className="text-sm font-normal">/month</span></div>
                        <ul className="text-sm space-y-1 mb-4">
                          <li>✓ Unlimited links</li>
                          <li>✓ Custom domains</li>
                          <li>✓ API access</li>
                          <li>✓ Priority support</li>
                        </ul>
                        <Button className="w-full">Upgrade to Premium</Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {user?.tier !== 'free' && (
                <div className="space-y-4">
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Billing Information</h4>
                      <p className="text-sm text-muted-foreground">
                        Manage your payment method and billing details
                      </p>
                    </div>
                    <Button variant="outline">
                      <Mail className="mr-2 h-4 w-4" />
                      Update Billing
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-red-600">Cancel Subscription</h4>
                      <p className="text-sm text-muted-foreground">
                        Cancel your subscription and downgrade to free plan
                      </p>
                    </div>
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Cancel Plan
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
