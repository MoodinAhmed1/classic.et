"use client"

import { useState, useEffect } from "react"
import { adminApi } from "@/lib/admin-api"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  Filter,
  RefreshCw,
  Download,
  Activity,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
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
  resource: string
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
  const [adminFilter, setAdminFilter] = useState<string>("all")
  const [resourceFilter, setResourceFilter] = useState<string>("all")
  const [logTypeFilter, setLogTypeFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)

  useEffect(() => {
    fetchLogs()
  }, [currentPage, actionFilter, adminFilter, resourceFilter, logTypeFilter])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      let allLogs: ActivityLog[] = []
      let totalCount = 0

      // Fetch admin activity logs
      if (logTypeFilter === "all" || logTypeFilter === "admin") {
        const adminParams = {
          limit: 25,
          offset: (currentPage - 1) * 25,
          action: actionFilter !== "all" ? actionFilter : undefined,
          adminUserId: adminFilter !== "all" ? adminFilter : undefined,
        }
        console.log('Fetching admin activity logs with params:', adminParams)
        const adminResponse = await adminApi.getActivityLogs(adminParams)
        console.log('Admin activity logs response:', adminResponse)
        const adminLogs = adminResponse.logs.map((log: any) => ({
          ...log,
          log_type: 'admin' as const,
          resource: log.resource,
          resource_type: log.resource
        }))
        allLogs = [...allLogs, ...adminLogs]
        totalCount += adminResponse.total
      }

      // Fetch user activity logs
      if (logTypeFilter === "all" || logTypeFilter === "user") {
        const userParams = {
          limit: 25,
          offset: (currentPage - 1) * 25,
          action: actionFilter !== "all" ? actionFilter : undefined,
          resourceType: resourceFilter !== "all" ? resourceFilter : undefined,
        }
        console.log('Fetching user activity logs with params:', userParams)
        const userResponse = await adminApi.getUserActivityLogs(userParams)
        console.log('User activity logs response:', userResponse)
        const userLogs = userResponse.logs.map((log: any) => ({
          ...log,
          log_type: 'user' as const,
          resource: log.resource_type,
          admin_user_id: undefined,
          admin_name: undefined,
          admin_email: undefined
        }))
        allLogs = [...allLogs, ...userLogs]
        totalCount += userResponse.total
      }

      // Sort by created_at descending
      allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      console.log('Final combined logs:', allLogs)
      console.log('Total count:', totalCount)

      setLogs(allLogs)
      setTotalLogs(totalCount)
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
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesResource = resourceFilter === "all" || log.resource === resourceFilter

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
        log.resource,
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
  const uniqueResources = Array.from(new Set(logs.map((log) => log.resource)))
  const uniqueAdmins = Array.from(new Set(logs.map((log) => log.admin_name)))

  return (
    <div className="space-y-3 md:space-y-6 px-1 md:px-0">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Activity Logs</h2>
        <p className="text-xs md:text-sm lg:text-base text-muted-foreground">Monitor system activity and admin actions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-2 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 md:px-6">
            <CardTitle className="text-xs font-medium truncate">Total Logs</CardTitle>
            <Activity className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            <div className="text-base md:text-lg lg:text-2xl font-bold">{totalLogs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground truncate">All activity records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 md:px-6">
            <CardTitle className="text-xs font-medium truncate">Today's Activity</CardTitle>
            <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            <div className="text-base md:text-lg lg:text-2xl font-bold">
              {logs.filter((log) => {
                const today = new Date().toDateString()
                return new Date(log.created_at).toDateString() === today
              }).length}
            </div>
            <p className="text-xs text-muted-foreground truncate">Actions today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 md:px-6">
            <CardTitle className="text-xs font-medium truncate">Active Admins</CardTitle>
            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            <div className="text-base md:text-lg lg:text-2xl font-bold">{uniqueAdmins.length}</div>
            <p className="text-xs text-muted-foreground truncate">Unique admin users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 md:px-6">
            <CardTitle className="text-xs font-medium truncate">Actions Types</CardTitle>
            <Shield className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            <div className="text-base md:text-lg lg:text-2xl font-bold">{uniqueActions.length}</div>
            <p className="text-xs text-muted-foreground truncate">Different action types</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-3 md:mb-6">
        <CardHeader className="pb-2 px-2 md:px-6">
          <div className="space-y-2 md:space-y-0 md:flex md:items-center md:justify-between">
            <CardTitle className="text-base md:text-lg lg:text-xl">Activity Logs</CardTitle>
            <div className="flex gap-2">
              <Button onClick={fetchLogs} className="flex-1 md:flex-none">
                <RefreshCw className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Sync</span>
              </Button>
              <Button variant="outline" onClick={handleExport} className="flex-1 md:flex-none">
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">CSV</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-1 md:px-6">
          <div className="space-y-2 md:space-y-0 md:flex md:gap-3 mb-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-1 md:flex md:gap-3">
              <Select value={logTypeFilter} onValueChange={setLogTypeFilter}>
                <SelectTrigger className="w-full md:w-40 text-xs md:text-sm">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="admin">Admin Only</SelectItem>
                  <SelectItem value="user">User Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full md:w-40 text-xs md:text-sm">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="w-full md:w-40 text-xs md:text-sm">
                  <SelectValue placeholder="Filter by resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  {uniqueResources.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource.charAt(0).toUpperCase() + resource.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile-first activity logs layout */}
          <div className="block md:hidden">
            {loading ? (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="h-6 w-6 mx-auto mb-2" />
                <p className="text-xs">Loading activity logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Activity className="h-6 w-6 mx-auto mb-2" />
                <p className="text-xs">No activity logs found matching your criteria.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <Card key={log.id} className="border">
                    <CardContent className="p-2">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge className={getActionColor(log.action)} variant="outline">
                            <span className="flex items-center gap-1 text-xs">
                              {getActionIcon(log.action)}
                              {log.action.toUpperCase()}
                            </span>
                          </Badge>
                          <Badge variant="outline" className="text-xs">{log.resource.toUpperCase()}</Badge>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">
                            {log.log_type === 'admin' ? log.admin_name : log.user_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {log.log_type === 'admin' ? log.admin_email : log.user_email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.log_type === 'admin' ? 'Admin' : 'User'}
                          </div>
                        </div>
                        <div className="bg-muted/50 p-2 rounded text-xs">
                          <div className="text-muted-foreground mb-1">Details:</div>
                          <div className="break-words text-xs">{log.details}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <div className="min-w-0">
                            <span className="text-muted-foreground">IP: </span>
                            <code className="bg-muted px-1 py-0.5 rounded text-xs break-all">{log.ip_address}</code>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs border-t pt-2">
                          <span className="text-muted-foreground">Date:</span>
                          <span className="font-medium text-xs">{formatDate(log.created_at)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Desktop table layout */}
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">User/Admin</TableHead>
                  <TableHead className="w-24">Action</TableHead>
                  <TableHead className="w-24">Resource</TableHead>
                  <TableHead className="min-w-0">Details</TableHead>
                  <TableHead className="w-32">IP Address</TableHead>
                  <TableHead className="w-40">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading activity logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No activity logs found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="min-w-0">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">
                            {log.log_type === 'admin' ? log.admin_name : log.user_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {log.log_type === 'admin' ? log.admin_email : log.user_email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.log_type === 'admin' ? 'Admin' : 'User'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)} variant="outline">
                          <span className="flex items-center gap-1 text-xs">
                            {getActionIcon(log.action)}
                            {log.action.toUpperCase()}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{log.resource.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="min-w-0">
                        <div className="max-w-xs truncate text-sm" title={log.details}>
                          {log.details}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.ip_address}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(log.created_at)}</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-3 md:mt-4 px-1 md:px-0">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-xs md:text-sm text-muted-foreground text-center md:text-left">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-1 md:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex-1 md:flex-none text-xs md:text-sm"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="flex-1 md:flex-none text-xs md:text-sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

