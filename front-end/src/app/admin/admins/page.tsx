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
    <>
      {canManageAdmins ? (
        <>
          <AdminHeader title="Admin User Management" subtitle="Manage admin users, roles, and permissions" />

          <main className="flex-1 overflow-y-auto p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{admins.length}</div>
                  <p className="text-xs text-muted-foreground">All admin users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Admins</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{admins.filter((a) => a.isActive).length}</div>
                  <p className="text-xs text-muted-foreground">Currently active</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{admins.filter((a) => a.role === "super_admin").length}</div>
                  <p className="text-xs text-muted-foreground">Full access</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Moderators</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{admins.filter((a) => a.role === "moderator").length}</div>
                  <p className="text-xs text-muted-foreground">Limited access</p>
                </CardContent>
              </Card>
            </div>

            {/* Admin Management */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <CardTitle>Admin Users</CardTitle>
                  {hasPermission("admins", "write") && (
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Admin
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Create New Admin User</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="admin-email">Email</Label>
                              <Input
                                id="admin-email"
                                type="email"
                                value={newAdminData.email}
                                onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                                placeholder="admin@example.com"
                              />
                            </div>
                            <div>
                              <Label htmlFor="admin-name">Name</Label>
                              <Input
                                id="admin-name"
                                value={newAdminData.name}
                                onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
                                placeholder="Full Name"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="admin-role">Role</Label>
                            <Select
                              value={newAdminData.role}
                              onValueChange={(value: AdminUser["role"]) => {
                                setNewAdminData({
                                  ...newAdminData,
                                  role: value,
                                  permissions: ROLE_PERMISSIONS[value],
                                })
                              }}
                            >
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
                          <div className="flex gap-2">
                            <Button onClick={handleCreateAdmin} className="flex-1">
                              Create Admin
                            </Button>
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search admin users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Filter by role" />
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
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admin User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading admin users...
                          </TableCell>
                        </TableRow>
                      ) : filteredAdmins.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            No admin users found matching your criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAdmins.map((admin) => (
                          <TableRow key={admin.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{admin.name}</div>
                                <div className="text-sm text-muted-foreground">{admin.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(admin.role)}>
                                <span className="flex items-center gap-1">
                                  {getRoleIcon(admin.role)}
                                  {admin.role.replace("_", " ").toUpperCase()}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={admin.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                              >
                                {admin.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleDateString() : "Never"}
                            </TableCell>
                            <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  {hasPermission("admins", "write") && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleEditAdmin(admin)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit Admin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleToggleAdminStatus(admin.id)}>
                                        {admin.isActive ? (
                                          <>
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Deactivate
                                          </>
                                        ) : (
                                          <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Activate
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  {hasPermission("admins", "delete") && admin.id !== currentAdmin?.id && (
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteAdmin(admin.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Admin
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

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
          </main>
        </>
      ) : (
        <>
          <AdminHeader title="Access Denied" subtitle="You don't have permission to access this page" />
          <main className="flex-1 overflow-y-auto p-6">
            <Card>
              <CardContent className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
                <p className="text-gray-600">You don't have permission to manage admin users.</p>
              </CardContent>
            </Card>
          </main>
        </>
      )}
    </>
  )
}
