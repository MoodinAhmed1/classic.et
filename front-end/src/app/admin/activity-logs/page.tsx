"use client"

import { useState, useEffect } from "react"
import { adminApi } from "@/lib/admin-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Filter,
  ChevronDown,
  ChevronUp,
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
  const [showFilters, setShowFilters] = useState(false)

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
          const adminResponse = await adminApi.getActivityLogs(adminParams)
          
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
          const userResponse = await adminApi.getUserActivityLogs(userParams)
          
          if (userResponse.logs && Array.isArray(userResponse.logs)) {
            const userLogs = userResponse.logs.map((log: any) => ({
              ...log,
              log_type: 'user' as const,
              resource: log.resource_type || 'unknown',
              resource_type: log.resource_type || 'unknown',
              admin_user_id: undefined,
              admin_name: undefined,
              admin_email: undefined
            }))
            allLogs = [...allLogs, ...userLogs]
            totalCount += userResponse.total || userLogs.length
            userCount = userResponse.total || userLogs.length
          }
        } catch (error) {
          console.error('Failed to fetch user logs:', error)
        }
      }

      // Sort by created_at descending
      allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

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

  if (loading) {
    return (
      <div className="container space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Activity Logs</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Monitor system activity and user actions</p>
        </div>

        {/* Loading Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-3 w-16 sm:h-4 sm:w-20 bg-muted animate-pulse rounded" />
                <div className="h-3 w-3 sm:h-4 sm:w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-6 w-12 sm:h-8 sm:w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-2 w-20 sm:h-3 sm:w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Content */}
        <Card>
          <CardHeader>
            <div className="h-4 w-32 sm:w-40 bg-muted animate-pulse rounded" />
            <div className="h-3 w-48 sm:w-56 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Activity Logs</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Monitor system activity and user actions across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-muted-foreground">Total Logs:</span>
          <Badge variant="outline" className="text-xs sm:text-sm">{totalLogs.toLocaleString()}</Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Logs</CardTitle>
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{totalLogs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All activity records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Admin Logs</CardTitle>
            <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{adminLogsCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Administrative actions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">User Logs</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{userLogsCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">User activities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Today</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {logs.filter((log) => {
                const today = new Date().toDateString()
                return new Date(log.created_at).toDateString() === today
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Actions today</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl">Activity Logs</CardTitle>
              <CardDescription className="text-sm">
                Showing {filteredLogs.length} of {totalLogs} logs
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full sm:w-auto"
              >
                <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Filters
                {showFilters ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 ml-2" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />}
              </Button>
              <Button onClick={fetchLogs} variant="outline" size="sm" className="w-full sm:w-auto">
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Sync</span>
              </Button>
              <Button onClick={handleExport} size="sm" className="w-full sm:w-auto">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 px-2 sm:px-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs by user, action, resource, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full text-sm"
            />
          </div>

          {/* Filters - Collapsible */}
          {showFilters && (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Select value={logTypeFilter} onValueChange={setLogTypeFilter}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Log Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="admin">Admin Only</SelectItem>
                  <SelectItem value="user">User Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full text-sm">
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
                <SelectTrigger className="w-full text-sm">
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
          )}

          {/* Mobile Cards Layout */}
          <div className="block lg:hidden">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No activity logs found matching your criteria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <Card key={log.id} className="border-l-4 border-l-primary/20 hover:border-l-primary/40 transition-colors">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header with Action and Resource */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={getActionColor(log.action)} variant="outline">
                            <span className="flex items-center gap-1 text-xs font-medium">
                              {getActionIcon(log.action)}
                              <span className="hidden sm:inline">{log.action.toUpperCase()}</span>
                              <span className="sm:hidden">{log.action.substring(0, 6).toUpperCase()}</span>
                            </span>
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-muted">
                            <span className="hidden sm:inline">{(log.resource || 'unknown').toUpperCase()}</span>
                            <span className="sm:hidden">{(log.resource || 'unknown').substring(0, 4).toUpperCase()}</span>
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {log.log_type === 'admin' ? 'Admin' : 'User'}
                          </Badge>
                        </div>

                        {/* User/Admin Info */}
                        <div className="space-y-1">
                          <div className="font-semibold text-sm text-foreground truncate">
                            {log.log_type === 'admin' ? log.admin_name : log.user_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {log.log_type === 'admin' ? log.admin_email : log.user_email}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <div className="text-xs font-medium text-muted-foreground mb-1">Details:</div>
                          <div className="text-sm break-words leading-relaxed">{log.details}</div>
                        </div>

                        {/* Meta Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">IP Address:</span>
                            <div className="font-mono bg-muted px-2 py-1 rounded mt-1 break-all text-xs truncate" title={log.ip_address}>
                              {log.ip_address}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Date:</span>
                            <div className="font-medium mt-1 text-xs truncate" title={formatDate(log.created_at)}>
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

          {/* Tablet Table Layout - Responsive with horizontal scroll */}
          <div className="hidden md:block lg:hidden">
            <div className="rounded-md border overflow-x-auto max-w-full">
              <div className="min-w-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-28 font-medium text-sm">User/Admin</TableHead>
                      <TableHead className="w-16 font-medium text-sm">Action</TableHead>
                      <TableHead className="w-16 font-medium text-sm">Resource</TableHead>
                      <TableHead className="min-w-[150px] font-medium text-sm">Details</TableHead>
                      <TableHead className="w-24 font-medium text-sm">IP</TableHead>
                      <TableHead className="w-28 font-medium text-sm">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                          <p className="text-sm text-muted-foreground">No activity logs found matching your criteria.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/50">
                          <TableCell className="py-2">
                            <div className="space-y-1">
                              <div className="font-medium text-sm truncate max-w-[100px]">
                                {log.log_type === 'admin' ? log.admin_name : log.user_name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[100px]">
                                {log.log_type === 'admin' ? log.admin_email : log.user_email}
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {log.log_type === 'admin' ? 'Admin' : 'User'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge className={getActionColor(log.action)} variant="outline">
                              <span className="flex items-center gap-1 text-xs">
                                {getActionIcon(log.action)}
                                <span className="truncate max-w-[50px]">{log.action.toUpperCase()}</span>
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-xs bg-muted">
                              <span className="truncate max-w-[50px]">{(log.resource || 'unknown').toUpperCase()}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="text-sm truncate max-w-[140px]" title={log.details}>
                              {log.details}
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-[80px] block" title={log.ip_address}>
                              {log.ip_address}
                            </code>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="text-sm text-muted-foreground truncate max-w-[100px]">
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
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden lg:block">
            <div className="rounded-md border overflow-x-auto max-w-full">
              <div className="min-w-[800px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-32 font-medium text-sm">User/Admin</TableHead>
                      <TableHead className="w-20 font-medium text-sm">Action</TableHead>
                      <TableHead className="w-20 font-medium text-sm">Resource</TableHead>
                      <TableHead className="min-w-[200px] font-medium text-sm">Details</TableHead>
                      <TableHead className="w-28 font-medium text-sm">IP Address</TableHead>
                      <TableHead className="w-32 font-medium text-sm">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                          <p className="text-sm text-muted-foreground">No activity logs found matching your criteria.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/50">
                          <TableCell className="py-3">
                            <div className="space-y-1">
                              <div className="font-medium text-sm truncate max-w-[120px]">
                                {log.log_type === 'admin' ? log.admin_name : log.user_name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[120px]">
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
                                <span className="truncate max-w-[60px]">{log.action.toUpperCase()}</span>
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant="outline" className="text-xs bg-muted">
                              <span className="truncate max-w-[60px]">{(log.resource || 'unknown').toUpperCase()}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="text-sm truncate max-w-[180px]" title={log.details}>
                              {log.details}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-[100px] block" title={log.ip_address}>
                              {log.ip_address}
                            </code>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="text-sm text-muted-foreground truncate max-w-[120px]">
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
          </div>

          {/* Pagination */}
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
                  className="px-4 text-sm"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 text-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

