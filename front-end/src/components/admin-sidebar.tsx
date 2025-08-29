"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Users,
  LinkIcon,
  Settings,
  Shield,
  CreditCard,
  Bell,
  Activity,
  LogOut,
  Crown,
  UserCheck,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAdminAuth } from "@/contexts/admin-auth-context"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: BarChart3, resource: "system", action: "read" },
  { name: "User Management", href: "/admin/users", icon: Users, resource: "users", action: "read" },
  { name: "Link Management", href: "/admin/links", icon: LinkIcon, resource: "links", action: "read" },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3, resource: "analytics", action: "read" },
  { name: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard, resource: "subscriptions", action: "read" },
  { name: "Payments", href: "/admin/payments", icon: Crown, resource: "subscriptions", action: "read" },
  { name: "Activity Logs", href: "/admin/activity-logs", icon: Activity, resource: "system", action: "read" },
  { name: "System Health", href: "/admin/system", icon: Activity, resource: "system", action: "read" },
  { name: "Notifications", href: "/admin/notifications", icon: Bell, resource: "system", action: "read" },
  { name: "Admin Users", href: "/admin/admins", icon: UserCheck, resource: "admins", action: "read" },
  { name: "Settings", href: "/admin/settings", icon: Settings, resource: "system", action: "write" },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { admin, logout, hasPermission } = useAdminAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Debug logging
  console.log('Debug - Admin Sidebar - Current admin:', admin)
  console.log('Debug - Admin Sidebar - Admin role:', admin?.role)
  console.log('Debug - Admin Sidebar - Is super admin?', admin?.role === "super_admin")

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      console.error("Admin logout error:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "moderator":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin":
        return <Shield className="h-3 w-3" />
      case "admin":
        return <Crown className="h-3 w-3" />
      case "moderator":
        return <UserCheck className="h-3 w-3" />
      default:
        return <AlertTriangle className="h-3 w-3" />
    }
  }

  return (
    <div className="flex flex-col w-64 bg-gray-800 text-white min-h-screen">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-gray-700">
        <Shield className="h-8 w-8 text-purple-400" />
        <span className="ml-2 text-xl font-bold">Admin Panel</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation
          .filter((item) => {
            // Admin Users page should only be visible to super admins
            if (item.href === "/admin/admins") {
              return admin?.role === "super_admin" || admin?.email === "admin@yoursite.com"
            }
            // All other pages use normal permission checking
            return hasPermission(item.resource, item.action)
          })
          .map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive ? "bg-purple-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
      </nav>

      {/* Admin Profile Section */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">
              {admin?.name?.[0]?.toUpperCase() || admin?.email?.[0]?.toUpperCase() || "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {admin?.name || admin?.email?.split("@")[0] || "Admin"}
            </p>
            <div className="flex items-center">
              <Badge className={`text-xs ${getRoleColor(admin?.role || "admin")}`}>
                <span className="flex items-center gap-1">
                  {getRoleIcon(admin?.role || "admin")}
                  {admin?.role?.replace("_", " ").toUpperCase() || "ADMIN"}
                </span>
              </Badge>
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <Button
          onClick={handleLogout}
          disabled={isLoggingOut}
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {isLoggingOut ? "Signing out..." : "Sign Out"}
        </Button>
      </div>
    </div>
  )
}
