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
import { User, Mail, Shield, Bell, Globe, Key, Trash2, Save, Loader2, Crown, Zap, Copy } from 'lucide-react';
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
    <div className="space-y-4 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Current Plan Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center space-x-3">
              {getTierIcon(user?.tier || 'free')}
              <div>
                <h3 className="font-medium text-base">
                  {user?.tier?.toUpperCase() || 'FREE'} Plan
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {user?.tier === 'premium' ? 'Unlimited everything' : 
                   user?.tier === 'pro' ? 'Advanced features' : 'Basic features'}
                </p>
              </div>
            </div>
            <Badge className={`text-sm ${getTierColor(user?.tier || 'free')}`}>
              {user?.tier?.toUpperCase() || 'FREE'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-10 bg-transparent p-0 gap-0">
            <TabsTrigger 
              value="profile" 
              className="text-sm py-4 sm:py-2 px-4 sm:px-3 h-auto sm:h-8 rounded-none sm:rounded-sm border-b-2 sm:border-b-0 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex items-center justify-center w-full space-x-2 sm:space-x-1.5">
                <User className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">Profile</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="text-sm py-4 sm:py-2 px-4 sm:px-3 h-auto sm:h-8 rounded-none sm:rounded-sm border-b-2 sm:border-b-0 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex items-center justify-center w-full space-x-2 sm:space-x-1.5">
                <Shield className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">Security</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="text-sm py-4 sm:py-2 px-4 sm:px-3 h-auto sm:h-8 rounded-none sm:rounded-sm border-b-2 sm:border-b-0 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex items-center justify-center w-full space-x-2 sm:space-x-1.5">
                <Bell className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">Notifications</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="api" 
              className="text-sm py-4 sm:py-2 px-4 sm:px-3 h-auto sm:h-8 rounded-none sm:rounded-sm border-b-2 sm:border-b-0 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex items-center justify-center w-full space-x-2 sm:space-x-1.5">
                <Key className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">API</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Information
              </CardTitle>
              <CardDescription className="text-sm">
                Update your personal information and profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="text-sm"
                />
              </div>
              <Button 
                onClick={handleProfileSave} 
                disabled={isProfileSaving}
                className="w-full sm:w-auto"
              >
                {isProfileSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security Settings
              </CardTitle>
              <CardDescription className="text-sm">
                Update your password and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-sm">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="text-sm"
                  />
                </div>
              </div>
              <Button 
                onClick={handlePasswordSave} 
                disabled={isPasswordSaving}
                className="w-full sm:w-auto"
              >
                {isPasswordSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Update Password
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-sm">
                Choose how you want to be notified about your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <Label className="text-sm">Email Notifications</Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Receive notifications about your account via email
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                  className="flex-shrink-0"
                />
              </div>
              <Separator />
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <Label className="text-sm">Marketing Emails</Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Receive promotional emails and updates
                  </p>
                </div>
                <Switch
                  checked={marketingEmails}
                  onCheckedChange={setMarketingEmails}
                  className="flex-shrink-0"
                />
              </div>
              <Separator />
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <Label className="text-sm">Weekly Reports</Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Get weekly analytics reports via email
                  </p>
                </div>
                <Switch
                  checked={weeklyReports}
                  onCheckedChange={setWeeklyReports}
                  className="flex-shrink-0"
                />
              </div>
              <Button 
                onClick={handleNotificationsSave} 
                disabled={isNotificationsSaving}
                className="w-full sm:w-auto"
              >
                {isNotificationsSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Key className="h-5 w-5 mr-2" />
                API Access
              </CardTitle>
              <CardDescription className="text-sm">
                Manage your API keys and access tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">API Key</Label>
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                  <Input
                    type={isApiKeyVisible ? "text" : "password"}
                    value={apiKey}
                    readOnly
                    className="text-sm font-mono flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsApiKeyVisible(!isApiKeyVisible)}
                    className="text-xs w-full sm:w-auto"
                  >
                    {isApiKeyVisible ? "Hide" : "Show"}
                  </Button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Keep your API key secure and never share it publicly
                </p>
              </div>
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <Button 
                  variant="outline"
                  onClick={generateNewApiKey}
                  className="text-sm w-full sm:w-auto"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Generate New Key
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(apiKey)}
                  className="text-sm w-full sm:w-auto"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Key
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-xl text-red-600 dark:text-red-400 flex items-center">
            <Trash2 className="h-5 w-5 mr-2" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-base">Delete Account</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button variant="destructive" size="sm" className="w-full sm:w-auto text-sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
