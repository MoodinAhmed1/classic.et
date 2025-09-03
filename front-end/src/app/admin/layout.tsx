import type React from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminAuthProvider } from "@/contexts/admin-auth-context"
import { AdminManagementProvider } from "@/contexts/admin-management-context"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminAuthProvider>
      <AdminManagementProvider>
        <div className="min-h-screen bg-background">
          <div className="flex">
            <AdminSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <AdminHeader />
              <main className="flex-1 p-6 min-w-0">{children}</main>
            </div>
          </div>
        </div>
      </AdminManagementProvider>
    </AdminAuthProvider>
  )
}
