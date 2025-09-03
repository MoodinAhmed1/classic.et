"use client"

import { useState, useEffect } from "react"
import { adminApi } from "@/lib/admin-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  RefreshCw,
  Download,
  Activity,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Users,
  UserCheck,
} from "lucide-react"

interface ActivityLog {
  id: string
  admin_user_id?: string
  admin_name?: string
  admin_email?: string
  user_id?: string
  user_name?: string
  user_email?: string
  action: string
  resource?: string
  resource_type?: string
  resource_id?: string
  details: string
  ip_address: string
  user_agent: string
  created_at: string
  log_type: 'admin' | 'user'
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [resourceFilter, setResourceFilter] = useState<string>("all")
  const [logTypeFilter, setLogTypeFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const [adminLogsCount, setAdminLogsCount] = useState(0)
  const [userLogsCount, setUserLogsCount] = useState(0)

  useEffect(() => {
    fetchLogs()
  }, [currentPage, actionFilter, resourceFilter, logTypeFilter])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      let allLogs: ActivityLog[] = []
      let totalCount = 0
      let adminCount = 0
      let userCount = 0

      // Fetch admin activity logs
      if (logTypeFilter === "all" || logTypeFilter === "admin") {
        try {
          const adminParams = {
            limit: 50,
            offset: (currentPage - 1) * 50,
            action: actionFilter !== "all" ? actionFilter : undefined,
          }
          console.log('Fetching admin activity logs with params:', adminParams)
          const adminResponse = await adminApi.getActivityLogs(adminParams)
          console.log('Admin activity logs response:', adminResponse)
          
          if (adminResponse.logs && Array.isArray(adminResponse.logs)) {
            const adminLogs = adminResponse.logs.map((log: any) => ({
              ...log,
              log_type: 'admin' as const,
              resource: log.resource || 'unknown',
              resource_type: log.resource || 'unknown'
            }))
            allLogs = [...allLogs, ...adminLogs]
            totalCount += adminResponse.total || adminLogs.length
            adminCount = adminResponse.total || adminLogs.length
            console.log('Admin logs processed:', adminLogs.length)
          } else {
            console.log('No admin logs found or invalid response format')
          }
        } catch (error) {
          console.error('Failed to fetch admin logs:', error)
        }
      }

      // Fetch user activity logs
      if (logTypeFilter === "all" || logTypeFilter === "user") {
        try {
          const userParams = {
            limit: 50,
            offset: (currentPage - 1) * 50,
            action: actionFilter !== "all" ? actionFilter : undefined,
            resourceType: resourceFilter !== "all" ? resourceFilter : undefined,
          }
          console.log('Fetching user activity logs with params:', userParams)
          const userResponse = await adminApi.getUserActivityLogs(userParams)
          console.log('User activity logs response:', userResponse)
          
          if (userResponse.logs && Array.isArray(userResponse.logs)) {
            const userLogs = userResponse.logs.map((log: any) => ({
              ...log,
              log_type: 'user' as const,
              resource: log.resource_type || 'unknown', // Map resource_type to resource for consistency
              resource_type: log.resource_type || 'unknown',
              admin_user_id: undefined,
              admin_name: undefined,
              admin_email: undefined
            }))
            allLogs = [...allLogs, ...userLogs]
            totalCount += userResponse.total || userLogs.length
            userCount = userResponse.total || userLogs.length
            console.log('User logs processed:', userLogs.length)
          } else {
            console.log('No user logs found or invalid response format')
            console.log('User response structure:', userResponse)
          }
        } catch (error) {
          console.error('Failed to fetch user logs:', error)
        }
      }

      // Sort by created_at descending
      allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      console.log('Final combined logs:', allLogs)
      console.log('Total count:', totalCount)
      console.log('Admin count:', adminCount)
      console.log('User count:', userCount)

      setLogs(allLogs)
      setTotalLogs(totalCount)
      setAdminLogsCount(adminCount)
      setUserLogsCount(userCount)
      setTotalPages(Math.ceil(totalCount / 50))
    } catch (error) {
      console.error("Failed to fetch activity logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (log.admin_email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.resource?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesResource = resourceFilter === "all" || (log.resource && log.resource === resourceFilter)

    return matchesSearch && matchesResource
  })

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('created') || action.includes('register')) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    }
    if (action.includes('update') || action.includes('updated') || action.includes('change')) {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    }
    if (action.includes('delete') || action.includes('deleted') || action.includes('remove')) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    }
    if (action.includes('login') || action.includes('logout') || action.includes('auth')) {
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    }
    if (action.includes('click') || action.includes('view') || action.includes('read')) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    }
    if (action.includes('payment') || action.includes('subscription') || action.includes('upgrade')) {
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
  }

  const getActionIcon = (action: string) => {
    if (action.includes('create') || action.includes('created') || action.includes('register')) {
      return <CheckCircle className="h-4 w-4" />
    }
    if (action.includes('update') || action.includes('updated') || action.includes('change')) {
      return <RefreshCw className="h-4 w-4" />
    }
    if (action.includes('delete') || action.includes('deleted') || action.includes('remove')) {
      return <AlertTriangle className="h-4 w-4" />
    }
    if (action.includes('login') || action.includes('logout') || action.includes('auth')) {
      return <Shield className="h-4 w-4" />
    }
    if (action.includes('click') || action.includes('view') || action.includes('read')) {
      return <Activity className="h-4 w-4" />
    }
    if (action.includes('payment') || action.includes('subscription') || action.includes('upgrade')) {
      return <User className="h-4 w-4" />
    }
    return <Activity className="h-4 w-4" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleExport = () => {
    const csvContent = [
      ["Type", "User/Admin", "Email", "Action", "Resource", "Details", "IP Address", "Date"],
      ...filteredLogs.map((log) => [
        log.log_type === 'admin' ? 'Admin' : 'User',
        log.log_type === 'admin' ? log.admin_name : log.user_name,
        log.log_type === 'admin' ? log.admin_email : log.user_email,
        log.action,
        log.resource || 'unknown',
        log.details,
        log.ip_address,
        formatDate(log.created_at),
      ]),
    ]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)))
  const uniqueResources = Array.from(new Set(logs.map((log) => log.resource).filter(Boolean)))

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Activity Logs</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Monitor system activity and user actions across the platform
          </p>
        </div>

        {/* Stats Cards - Mobile First Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Logs</CardTitle>
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalLogs.toLocaleString()}</div>
              <p className="text-xs text-blue-700 dark:text-blue-300">All activity records</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">Admin Logs</CardTitle>
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">{adminLogsCount.toLocaleString()}</div>
              <p className="text-xs text-green-700 dark:text-green-300">Administrative actions</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">User Logs</CardTitle>
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{userLogsCount.toLocaleString()}</div>
              <p className="text-xs text-purple-700 dark:text-purple-300">User activities</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">Today</CardTitle>
                <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {logs.filter((log) => {
                  const today = new Date().toDateString()
                  return new Date(log.created_at).toDateString() === today
                }).length}
              </div>
              <p className="text-xs text-orange-700 dark:text-orange-300">Actions today</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search - Mobile First */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">Activity Logs</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Showing {filteredLogs.length} of {totalLogs} logs
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={fetchLogs} variant="outline" className="w-full sm:w-auto">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Refresh</span>
                  <span className="sm:hidden">Sync</span>
                </Button>
                <Button onClick={handleExport} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs by user, action, resource, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            {/* Filters - Mobile First Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Select value={logTypeFilter} onValueChange={setLogTypeFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Log Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="admin">Admin Only</SelectItem>
                  <SelectItem value="user">User Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.slice(0, 10).map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Resource Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  {uniqueResources.slice(0, 10).map((resource) => (
                    <SelectItem key={resource || 'unknown'} value={resource || 'unknown'}>
                      {(resource || 'unknown').charAt(0).toUpperCase() + (resource || 'unknown').slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile Cards Layout */}
            <div className="block lg:hidden">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading activity logs...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No activity logs found matching your criteria.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLogs.map((log) => (
                    <Card key={log.id} className="border-l-4 border-l-primary/20 hover:border-l-primary/40 transition-colors">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header with Action and Resource */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={getActionColor(log.action)} variant="outline">
                              <span className="flex items-center gap-1 text-xs font-medium">
                                {getActionIcon(log.action)}
                                {log.action.toUpperCase()}
                              </span>
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-muted">
                              {(log.resource || 'unknown').toUpperCase()}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {log.log_type === 'admin' ? 'Admin' : 'User'}
                            </Badge>
                          </div>

                          {/* User/Admin Info */}
                          <div className="space-y-1">
                            <div className="font-semibold text-sm text-foreground">
                              {log.log_type === 'admin' ? log.admin_name : log.user_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.log_type === 'admin' ? log.admin_email : log.user_email}
                            </div>
                          </div>

                          {/* Details */}
                          <div className="bg-muted/30 p-3 rounded-lg">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Details:</div>
                            <div className="text-sm break-words">{log.details}</div>
                          </div>

                          {/* Meta Information */}
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">IP:</span>
                              <div className="font-mono bg-muted px-2 py-1 rounded mt-1 break-all">
                                {log.ip_address}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Date:</span>
                              <div className="font-medium mt-1">
                                {formatDate(log.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden lg:block">
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-48 font-medium">User/Admin</TableHead>
                      <TableHead className="w-24 font-medium">Action</TableHead>
                      <TableHead className="w-24 font-medium">Resource</TableHead>
                      <TableHead className="min-w-0 font-medium">Details</TableHead>
                      <TableHead className="w-32 font-medium">IP Address</TableHead>
                      <TableHead className="w-40 font-medium">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                          <p className="text-muted-foreground">Loading activity logs...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No activity logs found matching your criteria.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/50">
                          <TableCell className="py-3">
                            <div className="space-y-1">
                              <div className="font-medium text-sm">
                                {log.log_type === 'admin' ? log.admin_name : log.user_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {log.log_type === 'admin' ? log.admin_email : log.user_email}
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {log.log_type === 'admin' ? 'Admin' : 'User'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge className={getActionColor(log.action)} variant="outline">
                              <span className="flex items-center gap-1 text-xs">
                                {getActionIcon(log.action)}
                                {log.action.toUpperCase()}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant="outline" className="text-xs bg-muted">
                              {(log.resource || 'unknown').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 max-w-xs">
                            <div className="text-sm" title={log.details}>
                              {log.details}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                              {log.ip_address}
                            </code>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="text-sm text-muted-foreground">
                              {formatDate(log.created_at)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination - Mobile First */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Page {currentPage} of {totalPages} • {totalLogs.toLocaleString()} total logs
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

