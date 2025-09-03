"use client"

import { useState, useEffect } from "react"
import { adminApi } from "@/lib/admin-api"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Settings,
  Shield,
  Globe,
  Mail,
  Database,
  Bell,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Server,
  Lock,
  Users,
  Activity,
} from "lucide-react"

interface SystemSettings {
  site_name: string
  site_description: string
  site_url: string
  contact_email: string
  support_email: string
  max_links_per_user: number
  max_clicks_per_link: number
  link_expiry_days: number
  enable_registration: boolean
  require_email_verification: boolean
  enable_analytics: boolean
  enable_notifications: boolean
  maintenance_mode: boolean
  maintenance_message: string
  session_timeout_minutes: number
  max_login_attempts: number
  password_min_length: number
  enable_two_factor: boolean
  log_retention_days: number
  backup_frequency: string
  chapa_webhook_url: string
  chapa_secret_key: string
  resend_api_key: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    site_name: "",
    site_description: "",
    site_url: "",
    contact_email: "",
    support_email: "",
    max_links_per_user: 100,
    max_clicks_per_link: 10000,
    link_expiry_days: 365,
    enable_registration: true,
    require_email_verification: true,
    enable_analytics: true,
    enable_notifications: true,
    maintenance_mode: false,
    maintenance_message: "",
    session_timeout_minutes: 60,
    max_login_attempts: 5,
    password_min_length: 8,
    enable_two_factor: false,
    log_retention_days: 90,
    backup_frequency: "daily",
    chapa_webhook_url: "",
    chapa_secret_key: "",
    resend_api_key: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await adminApi.getSystemSettings()
      setSettings(response.settings)
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      toast({
        title: "Error",
        description: "Failed to load system settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await adminApi.updateSystemSettings({ settings })
      toast({
        title: "Success",
        description: "Settings saved successfully",
      })
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    fetchSettings()
    toast({
      title: "Reset",
      description: "Settings reset to last saved values",
    })
  }

  const tabs = [
    { id: "general", name: "General", icon: Settings },
    { id: "security", name: "Security", icon: Shield },
    { id: "integrations", name: "Integrations", icon: Globe },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "system", name: "System", icon: Server },
  ]

  if (loading) {
    return (
      <>
        <AdminHeader title="Settings" subtitle="Configure system settings and preferences" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        </main>
      </>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Configure system settings and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab.id
                          ? "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100"
                          : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      {tab.name}
                    </button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="space-y-4 sm:space-y-6">
            {/* General Settings */}
            {activeTab === "general" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    General Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="site_name">Site Name</Label>
                      <Input
                        id="site_name"
                        value={settings.site_name}
                        onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                        placeholder="My URL Shortener"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="site_url">Site URL</Label>
                      <Input
                        id="site_url"
                        value={settings.site_url}
                        onChange={(e) => setSettings({ ...settings, site_url: e.target.value })}
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="site_description">Site Description</Label>
                    <Textarea
                      id="site_description"
                      value={settings.site_description}
                      onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
                      placeholder="A powerful URL shortening service"
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={settings.contact_email}
                        onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                        placeholder="contact@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="support_email">Support Email</Label>
                      <Input
                        id="support_email"
                        type="email"
                        value={settings.support_email}
                        onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                        placeholder="support@example.com"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Settings */}
            {activeTab === "security" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Security Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="session_timeout">Session Timeout (Minutes)</Label>
                      <Input
                        id="session_timeout"
                        type="number"
                        value={settings.session_timeout_minutes}
                        onChange={(e) => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) || 0 })}
                        min="15"
                        max="1440"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_login_attempts">Max Login Attempts</Label>
                      <Input
                        id="max_login_attempts"
                        type="number"
                        value={settings.max_login_attempts}
                        onChange={(e) => setSettings({ ...settings, max_login_attempts: parseInt(e.target.value) || 0 })}
                        min="3"
                        max="10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password_min_length">Minimum Password Length</Label>
                    <Input
                      id="password_min_length"
                      type="number"
                      value={settings.password_min_length}
                      onChange={(e) => setSettings({ ...settings, password_min_length: parseInt(e.target.value) || 0 })}
                      min="6"
                      max="32"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                    </div>
                    <Switch
                      checked={settings.enable_two_factor}
                      onCheckedChange={(checked) => setSettings({ ...settings, enable_two_factor: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="log_retention">Log Retention (Days)</Label>
                    <Input
                      id="log_retention"
                      type="number"
                      value={settings.log_retention_days}
                      onChange={(e) => setSettings({ ...settings, log_retention_days: parseInt(e.target.value) || 0 })}
                      min="7"
                      max="365"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Integrations Settings */}
            {activeTab === "integrations" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="h-5 w-5 mr-2" />
                    Integrations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">Chapa Payment</Badge>
                      <Badge variant="secondary">Payment Gateway</Badge>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chapa_webhook_url">Chapa Webhook URL</Label>
                      <Input
                        id="chapa_webhook_url"
                        value={settings.chapa_webhook_url}
                        onChange={(e) => setSettings({ ...settings, chapa_webhook_url: e.target.value })}
                        placeholder="https://your-domain.com/api/webhooks/chapa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chapa_secret_key">Chapa Secret Key</Label>
                      <Input
                        id="chapa_secret_key"
                        type="password"
                        value={settings.chapa_secret_key}
                        onChange={(e) => setSettings({ ...settings, chapa_secret_key: e.target.value })}
                        placeholder="Enter your Chapa secret key"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">Resend</Badge>
                      <Badge variant="secondary">Email Service</Badge>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resend_api_key">Resend API Key</Label>
                      <Input
                        id="resend_api_key"
                        type="password"
                        value={settings.resend_api_key}
                        onChange={(e) => setSettings({ ...settings, resend_api_key: e.target.value })}
                        placeholder="Enter your Resend API key"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications Settings */}
            {activeTab === "notifications" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Analytics</Label>
                      <p className="text-sm text-muted-foreground">Track and display analytics data</p>
                    </div>
                    <Switch
                      checked={settings.enable_analytics}
                      onCheckedChange={(checked) => setSettings({ ...settings, enable_analytics: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Notifications</Label>
                      <p className="text-sm text-muted-foreground">Send email notifications for important events</p>
                    </div>
                    <Switch
                      checked={settings.enable_notifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, enable_notifications: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">Put the site in maintenance mode</p>
                    </div>
                    <Switch
                      checked={settings.maintenance_mode}
                      onCheckedChange={(checked) => setSettings({ ...settings, maintenance_mode: checked })}
                    />
                  </div>

                  {settings.maintenance_mode && (
                    <div className="space-y-2">
                      <Label htmlFor="maintenance_message">Maintenance Message</Label>
                      <Textarea
                        id="maintenance_message"
                        value={settings.maintenance_message}
                        onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
                        placeholder="We're currently performing maintenance. Please check back soon."
                        rows={3}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* System Settings */}
            {activeTab === "system" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Server className="h-5 w-5 mr-2" />
                    System Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="backup_frequency">Backup Frequency</Label>
                    <Select value={settings.backup_frequency} onValueChange={(value) => setSettings({ ...settings, backup_frequency: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Database Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Connected</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Cache Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Active</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Queue Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Running</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

