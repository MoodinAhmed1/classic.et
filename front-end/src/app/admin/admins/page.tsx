"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
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
  RefreshCw,
} from "lucide-react"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { useAdminManagement } from "@/contexts/admin-management-context"
import { ROLE_PERMISSIONS } from "@/lib/admin-management-api"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AdminUserManagement() {
  const { admin: currentAdmin, hasPermission } = useAdminAuth()
  const { toast } = useToast()
  const {
    admins,
    loading,
    actionLoading,
    error,
    fetchAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    toggleAdminStatus,
    clearError,
  } = useAdminManagement()

  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null)
  const [adminToDelete, setAdminToDelete] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [newAdminData, setNewAdminData] = useState({
    email: "",
    name: "",
    password: "",
    role: "moderator" as "admin" | "moderator" | "analyst",
  })

  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch =
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || admin.role === roleFilter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && admin.is_active) ||
      (statusFilter === "inactive" && !admin.is_active)

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

  const handleCreateAdmin = async () => {
    try {
      if (!newAdminData.email || !newAdminData.name || !newAdminData.password || !newAdminData.role) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      const admin = await createAdmin({
        email: newAdminData.email,
        name: newAdminData.name,
        password: newAdminData.password,
        role: newAdminData.role,
      })

      if (admin) {
        // Reset form and close dialog
        setNewAdminData({
          email: "",
          name: "",
          password: "",
          role: "moderator",
        })
        setIsCreateDialogOpen(false)
      }
    } catch (error: any) {
      console.error("Failed to create admin:", error)
    }
  }

  const handleSaveAdminChanges = async () => {
    if (!selectedAdmin) return

    try {
      const admin = await updateAdmin(selectedAdmin.id, {
        name: selectedAdmin.name,
        role: selectedAdmin.role,
        permissions: selectedAdmin.permissions,
        isActive: selectedAdmin.is_active,
      })

      if (admin) {
        setIsEditDialogOpen(false)
        setSelectedAdmin(null)
      }
    } catch (error: any) {
      console.error("Failed to update admin:", error)
    }
  }

  const handleToggleAdminStatus = async (adminId: string) => {
    try {
      await toggleAdminStatus(adminId)
    } catch (error: any) {
      console.error("Failed to toggle admin status:", error)
    }
  }

  const handleDeleteAdmin = async (admin: any) => {
    setAdminToDelete(admin)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteAdmin = async () => {
    if (!adminToDelete) return

    try {
      const success = await deleteAdmin(adminToDelete.id)
      if (success) {
        setIsDeleteDialogOpen(false)
        setAdminToDelete(null)
      }
    } catch (error: any) {
      console.error("Failed to delete admin:", error)
    }
  }

  const updatePermissions = (resource: string, action: string, checked: boolean) => {
    if (!selectedAdmin) return

    const updatedPermissions = { ...selectedAdmin.permissions }
    if (checked) {
      if (!updatedPermissions[resource].includes(action)) {
        updatedPermissions[resource].push(action)
      }
    } else {
      updatedPermissions[resource] = updatedPermissions[resource].filter((perm: string) => perm !== action)
    }

    setSelectedAdmin({ ...selectedAdmin, permissions: updatedPermissions })
  }

  const handleRefresh = () => {
    fetchAdmins()
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Admin User Management</h2>
          <Button onClick={clearError} variant="outline">
            Clear Error
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Error: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Admin User Management</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage admin users, roles, and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {hasPermission("admins", "write") && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader className="pb-4">
                  <DialogTitle className="text-lg sm:text-xl">Create New Admin</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newAdminData.email}
                      onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                      placeholder="admin@example.com"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                    <Input
                      id="name"
                      value={newAdminData.name}
                      onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
                      placeholder="Full name"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newAdminData.password}
                      onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                      placeholder="Temporary password"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium">Role</Label>
                    <Select value={newAdminData.role} onValueChange={(value: any) => setNewAdminData({ ...newAdminData, role: value })}>
                      <SelectTrigger className="h-9 sm:h-10">
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
                <div className="flex flex-col-reverse gap-2 sm:flex-row pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)} 
                    className="w-full sm:w-auto h-9 sm:h-10"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateAdmin} 
                    className="w-full sm:w-auto h-9 sm:h-10" 
                    disabled={actionLoading}
                    size="sm"
                  >
                    {actionLoading ? "Creating..." : "Create Admin"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
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
            <div className="text-lg sm:text-2xl font-bold">{admins.filter((a) => a.is_active).length}</div>
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
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading admins...</p>
                  </div>
                ) : filteredAdmins.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No admins found</p>
                  </div>
                ) : (
                  filteredAdmins.map((admin) => (
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
                          <Badge variant={admin.is_active ? "default" : "secondary"}>
                            {admin.is_active ? "Active" : "Inactive"}
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
                            <DropdownMenuItem
                              onClick={() => handleToggleAdminStatus(admin.id)}
                            >
                              {admin.is_active ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteAdmin(admin)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Admin
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

            {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg sm:text-xl">Edit Admin User</DialogTitle>
          </DialogHeader>
          {selectedAdmin && (
            <div className="space-y-4 sm:space-y-6">
              {/* Basic Info Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email" className="text-sm font-medium">Email</Label>
                  <Input 
                    id="edit-email" 
                    value={selectedAdmin.email} 
                    disabled 
                    className="bg-muted text-sm h-9 sm:h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm font-medium">Name</Label>
                  <Input 
                    id="edit-name" 
                    value={selectedAdmin.name}
                    onChange={(e) => setSelectedAdmin({ ...selectedAdmin, name: e.target.value })}
                    className="text-sm h-9 sm:h-10"
                  />
                </div>
              </div>
              
              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="edit-role" className="text-sm font-medium">Role</Label>
                <Select 
                  value={selectedAdmin.role} 
                  onValueChange={(value: any) => setSelectedAdmin({ ...selectedAdmin, role: value })}
                >
                  <SelectTrigger className="h-9 sm:h-10">
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
              <div className="space-y-3">
                <Label className="text-sm font-medium">Permissions</Label>
                <div className="space-y-3 sm:space-y-4">
                  {Object.entries(selectedAdmin.permissions).map(([resource, actions]) => (
                    <div key={resource} className="border rounded-lg p-3 sm:p-4">
                      <h4 className="font-medium mb-3 capitalize text-sm sm:text-base">{resource}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                        {["read", "write", "delete"].map((action) => (
                          <div key={action} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${resource}-${action}`}
                              checked={Array.isArray(actions) && actions.includes(action)}
                              onCheckedChange={(checked) =>
                                updatePermissions(resource, action, Boolean(checked))
                              }
                              className="h-4 w-4"
                            />
                            <Label 
                              htmlFor={`${resource}-${action}`} 
                              className="capitalize text-sm cursor-pointer"
                            >
                              {action}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button 
                  className="flex-1 order-2 sm:order-1 h-9 sm:h-10" 
                  onClick={handleSaveAdminChanges} 
                  disabled={actionLoading}
                  size="sm"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="order-1 sm:order-2 h-9 sm:h-10"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {adminToDelete?.name} ({adminToDelete?.email})? 
              This action cannot be undone and will permanently remove this admin user from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAdmin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionLoading}
            >
              {actionLoading ? "Deleting..." : "Delete Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Toaster />
    </div>
  )
}

