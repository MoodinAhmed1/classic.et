"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useToast } from '@/hooks/use-toast'
import { 
  adminManagementApi, 
  AdminUser, 
  CreateAdminData, 
  UpdateAdminData,
  ROLE_PERMISSIONS 
} from '@/lib/admin-management-api'

interface AdminManagementContextType {
  admins: AdminUser[]
  loading: boolean
  actionLoading: boolean
  error: string | null
  fetchAdmins: () => Promise<void>
  createAdmin: (data: CreateAdminData) => Promise<AdminUser | null>
  updateAdmin: (id: string, data: UpdateAdminData) => Promise<AdminUser | null>
  deleteAdmin: (id: string) => Promise<boolean>
  toggleAdminStatus: (id: string) => Promise<boolean>
  clearError: () => void
}

const AdminManagementContext = createContext<AdminManagementContextType | undefined>(undefined)

export function useAdminManagement() {
  const context = useContext(AdminManagementContext)
  if (context === undefined) {
    throw new Error('useAdminManagement must be used within an AdminManagementProvider')
  }
  return context
}

interface AdminManagementProviderProps {
  children: ReactNode
}

export function AdminManagementProvider({ children }: AdminManagementProviderProps) {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchAdmins = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await adminManagementApi.getAdminUsers()
      setAdmins(response.adminUsers)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch admin users'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createAdmin = async (data: CreateAdminData): Promise<AdminUser | null> => {
    setActionLoading(true)
    setError(null)
    try {
      // Set permissions based on role if not provided
      const permissions = data.permissions || ROLE_PERMISSIONS[data.role]
      
      const response = await adminManagementApi.createAdminUser({
        ...data,
        permissions
      })
      
      // Add the new admin to the list
      setAdmins(prev => [response.adminUser, ...prev])
      
      toast({
        title: "Success",
        description: "Admin user created successfully!",
      })
      
      return response.adminUser
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create admin user'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      return null
    } finally {
      setActionLoading(false)
    }
  }

  const updateAdmin = async (id: string, data: UpdateAdminData): Promise<AdminUser | null> => {
    setActionLoading(true)
    setError(null)
    try {
      const response = await adminManagementApi.updateAdminUser(id, data)
      
      // Update the admin in the list
      setAdmins(prev => prev.map(admin => 
        admin.id === id ? response.adminUser : admin
      ))
      
      toast({
        title: "Success",
        description: "Admin user updated successfully!",
      })
      
      return response.adminUser
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update admin user'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      return null
    } finally {
      setActionLoading(false)
    }
  }

  const deleteAdmin = async (id: string): Promise<boolean> => {
    setActionLoading(true)
    setError(null)
    try {
      await adminManagementApi.deleteAdminUser(id)
      
      // Remove the admin from the list
      setAdmins(prev => prev.filter(admin => admin.id !== id))
      
      toast({
        title: "Success",
        description: "Admin user deleted successfully!",
      })
      
      return true
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete admin user'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      return false
    } finally {
      setActionLoading(false)
    }
  }

  const toggleAdminStatus = async (id: string): Promise<boolean> => {
    setActionLoading(true)
    setError(null)
    try {
      const response = await adminManagementApi.toggleAdminStatus(id)
      
      // Update the admin status in the list
      setAdmins(prev => prev.map(admin => 
        admin.id === id ? { ...admin, is_active: response.isActive } : admin
      ))
      
      const statusText = response.isActive ? 'activated' : 'deactivated'
      toast({
        title: "Success",
        description: `Admin user ${statusText} successfully!`,
      })
      
      return true
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to toggle admin status'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      return false
    } finally {
      setActionLoading(false)
    }
  }

  const clearError = () => {
    setError(null)
  }

  // Fetch admins on mount
  useEffect(() => {
    fetchAdmins()
  }, [])

  const value: AdminManagementContextType = {
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
  }

  return (
    <AdminManagementContext.Provider value={value}>
      {children}
    </AdminManagementContext.Provider>
  )
}
