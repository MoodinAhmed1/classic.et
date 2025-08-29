"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import {
  LayoutDashboard,
  Users,
  LinkIcon,
  BarChart3,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  Database,
} from "lucide-react"

interface AdminSidebarProps {
  className?: string
}

const navigation = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    description: "Overview and key metrics",
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: Users,
    description: "Manage user accounts",
  },
  {
    name: "Admins",
    href: "/admin/admins",
    icon: Shield,
    description: "Manage admin accounts",
  },
  {
    name: "Links",
    href: "/admin/links",
    icon: LinkIcon,
    description: "Manage shortened links",
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    description: "System analytics and reports",
  },
  {
    name: "Subscriptions",
    href: "/admin/subscriptions",
    icon: CreditCard,
    description: "Subscription management",
  },
  {
    name: "Payments",
    href: "/admin/payments",
    icon: Database,
    description: "Payment transactions",
  },
  {
    name: "Activity Log",
    href: "/admin/activity-logs",
    icon: Activity,
    description: "Admin activity audit trail",
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    description: "System configuration",
  },
]

export function AdminSidebar({ className }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { hasPermission } = useAdminAuth()

  return (
    <div
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sidebar-accent rounded-lg">
              <Shield className="h-5 w-5 text-sidebar-accent-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-sidebar-foreground">Admin Panel</h2>
              <p className="text-xs text-sidebar-foreground/60">URL Shortener</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigation
            .filter((item) => {
              const routeToPerm: Record<string, { resource: string; action: string }> = {
                "/admin/dashboard": { resource: "system", action: "read" },
                "/admin/users": { resource: "users", action: "read" },
                "/admin/admins": { resource: "admins", action: "read" },
                "/admin/links": { resource: "links", action: "read" },
                "/admin/analytics": { resource: "analytics", action: "read" },
                "/admin/subscriptions": { resource: "subscriptions", action: "read" },
                "/admin/payments": { resource: "subscriptions", action: "read" },
                "/admin/activity-logs": { resource: "system", action: "read" },
                "/admin/settings": { resource: "system", action: "write" },
              }
              const perm = routeToPerm[item.href]
              return perm ? hasPermission(perm.resource, perm.action) : true
            })
            .map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs opacity-60 truncate">{item.description}</div>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}
