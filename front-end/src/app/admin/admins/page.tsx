"use client"

import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  MoreHorizontal,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Crown,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
} from "lucide-react"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi } from "@/lib/admin-api"

interface AdminUser {
  id: string
  email: string
  name: string
  role: "super_admin" | "admin" | "moderator" | "analyst"
  permissions: {
    users: string[]
    links: string[]
    subscriptions: string[]
    analytics: string[]
    system: string[]
    admins: string[]
  }
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

const ROLE_PERMISSIONS = {
  super_admin: {
    users: ["read", "write", "delete"],
    links: ["read", "write", "delete"],
    subscriptions: ["read", "write", "delete"],
    analytics: ["read", "write"],
    system: ["read", "write", "delete"],
    admins: ["read", "write", "delete"],
  },
  admin: {
    users: ["read", "write"],
    links: ["read", "write"],
    subscriptions: ["read", "write"],
    analytics: ["read", "write"],
    system: ["read"],
    admins: ["read"],
  },
  moderator: {
    users: ["read"],
    links: ["read", "write"],
    subscriptions: ["read"],
    analytics: ["read"],
    system: ["read"],
    admins: [],
  },
  analyst: {
    users: ["read"],
    links: ["read"],
    subscriptions: ["read"],
    analytics: ["read", "write"],
    system: ["read"],
    admins: [],
  },
}

export default function AdminUserManagement() {
  const { admin: currentAdmin, hasPermission } = useAdminAuth()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newAdminData, setNewAdminData] = useState({
    email: "",
    name: "",
    password: "",
    role: "moderator" as AdminUser["role"],
    permissions: ROLE_PERMISSIONS.moderator,
  })

  useEffect(() => {
    fetchAdmins()
  }, [])

  // Check if current admin can manage other admins
  const canManageAdmins = hasPermission("admins", "read")

  const fetchAdmins = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getAdminUsers()
      const mapped = (res.adminUsers as any[]).map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        permissions: u.permissions || ROLE_PERMISSIONS[u.role as keyof typeof ROLE_PERMISSIONS] || ROLE_PERMISSIONS.admin,
        isActive: u.is_active ?? u.isActive ?? true,
        lastLoginAt: u.last_login_at ?? u.lastLoginAt ?? null,
        createdAt: u.created_at ?? u.createdAt,
      }))
      setAdmins(mapped)
    } catch (error) {
      console.error("Failed to fetch admin users:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch =
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || admin.role === roleFilter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && admin.isActive) ||
      (statusFilter === "inactive" && !admin.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "moderator":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "analyst":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin":
        return <Shield className="h-4 w-4" />
      case "admin":
        return <Crown className="h-4 w-4" />
      case "moderator":
        return <UserCheck className="h-4 w-4" />
      case "analyst":
        return <BarChart3 className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const handleCreateAdmin = async () => {
    try {
      // API call to create admin
      console.log("Creating admin:", newAdminData)
      setIsCreateDialogOpen(false)
      fetchAdmins()
    } catch (error) {
      console.error("Failed to create admin:", error)
    }
  }

  const handleEditAdmin = (admin: AdminUser) => {
    setSelectedAdmin(admin)
    setIsEditDialogOpen(true)
  }

  const handleToggleAdminStatus = async (adminId: string) => {
    try {
      // API call to toggle admin status
      console.log("Toggling admin status:", adminId)
      fetchAdmins()
    } catch (error) {
      console.error("Failed to toggle admin status:", error)
    }
  }

  const handleDeleteAdmin = async (adminId: string) => {
    try {
      // API call to delete admin
      console.log("Deleting admin:", adminId)
      fetchAdmins()
    } catch (error) {
      console.error("Failed to delete admin:", error)
    }
  }

  const updatePermissions = (resource: string, action: string, checked: boolean) => {
    if (!selectedAdmin) return

    const updatedPermissions = { ...selectedAdmin.permissions }
    if (checked) {
      if (!updatedPermissions[resource as keyof typeof updatedPermissions].includes(action)) {
        updatedPermissions[resource as keyof typeof updatedPermissions].push(action)
      }
    } else {
      updatedPermissions[resource as keyof typeof updatedPermissions] = updatedPermissions[
        resource as keyof typeof updatedPermissions
      ].filter((perm) => perm !== action)
    }

    setSelectedAdmin({ ...selectedAdmin, permissions: updatedPermissions })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Admin User Management</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage admin users, roles, and permissions</p>
        </div>
        {hasPermission("admins", "write") && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Admin</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAdminData.email}
                    onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newAdminData.name}
                    onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newAdminData.password}
                    onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                    placeholder="Temporary password"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newAdminData.role} onValueChange={(value: any) => setNewAdminData({ ...newAdminData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleCreateAdmin} className="w-full sm:w-auto">Create Admin</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Admins</CardTitle>
            <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{admins.length}</div>
            <p className="text-xs text-muted-foreground">All admin users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Admins</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{admins.filter((a) => a.isActive).length}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Super Admins</CardTitle>
            <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{admins.filter((a) => a.role === "super_admin").length}</div>
            <p className="text-xs text-muted-foreground">Full access</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Moderators</CardTitle>
            <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{admins.filter((a) => a.role === "moderator").length}</div>
            <p className="text-xs text-muted-foreground">Limited access</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Management */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Admin Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search admins..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                {filteredAdmins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{admin.name}</div>
                        <div className="text-sm text-muted-foreground truncate">{admin.email}</div>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleColor(admin.role)}>{admin.role.replace("_", " ")}</Badge>
                        <Badge variant={admin.isActive ? "default" : "secondary"}>
                          {admin.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedAdmin(admin)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Admin
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteAdmin(admin.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Admin
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
          </DialogHeader>
          {selectedAdmin && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" defaultValue={selectedAdmin.email} />
                </div>
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input id="edit-name" defaultValue={selectedAdmin.name} />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select defaultValue={selectedAdmin.role}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentAdmin?.role === "super_admin" && (
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    )}
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Permissions Matrix */}
              <div>
                <Label>Permissions</Label>
                <div className="mt-2 space-y-4">
                  {Object.entries(selectedAdmin.permissions).map(([resource, actions]) => (
                    <div key={resource} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3 capitalize">{resource}</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {["read", "write", "delete"].map((action) => (
                          <div key={action} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${resource}-${action}`}
                              checked={actions.includes(action)}
                              onCheckedChange={(checked) =>
                                updatePermissions(resource, action, checked as boolean)
                              }
                            />
                            <Label htmlFor={`${resource}-${action}`} className="capitalize">
                              {action}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1">Save Changes</Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
