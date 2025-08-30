"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  BarChart3,
  Copy,
  Eye,
  EyeOff,
  Calendar,
  RefreshCw,
  Download,
} from "lucide-react"
import { adminApi } from "@/lib/admin-api"

interface AdminLink {
  id: string
  user_id: string
  user_name: string
  user_email: string
  original_url: string
  short_code: string
  custom_domain?: string
  title?: string
  description?: string
  is_active: boolean
  expires_at?: string
  click_count: number
  created_at: string
  updated_at: string
  last_clicked?: string
}

export default function LinksPage() {
  const [links, setLinks] = useState<AdminLink[]>([])
  const [filteredLinks, setFilteredLinks] = useState<AdminLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [selectedLinks, setSelectedLinks] = useState<string[]>([])
  const [selectedLink, setSelectedLink] = useState<AdminLink | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAnalyticsDialogOpen, setIsAnalyticsDialogOpen] = useState(false)

  useEffect(() => {
    fetchLinks()
  }, [])

  useEffect(() => {
    filterLinks()
  }, [links, searchTerm, statusFilter, userFilter])

  const fetchLinks = async () => {
    try {
      setIsLoading(true)
      const res = await adminApi.getLinks()
      setLinks(res.links as any)
    } catch (error) {
      console.error("Failed to fetch links:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterLinks = () => {
    let filtered = links

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (link) =>
          link.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          link.short_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          link.original_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
          link.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          link.user_email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter((link) => link.is_active)
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter((link) => !link.is_active)
      } else if (statusFilter === "expired") {
        filtered = filtered.filter((link) => link.expires_at && new Date(link.expires_at) < new Date())
      }
    }

    // User filter
    if (userFilter !== "all") {
      filtered = filtered.filter((link) => link.user_id === userFilter)
    }

    setFilteredLinks(filtered)
  }

  const handleToggleStatus = async (linkId: string) => {
    try {
      const link = links.find((l) => l.id === linkId)
      if (!link) return

      await adminApi.updateLink(linkId, {
        isActive: !link.is_active,
      })

      // Update local state
      const updatedLinks = links.map((l) =>
        l.id === linkId ? { ...l, is_active: !l.is_active, updated_at: new Date().toISOString() } : l,
      )
      setLinks(updatedLinks)
    } catch (error) {
      console.error("Failed to toggle link status:", error)
      alert("Failed to update link status. Please try again.")
    }
  }

  const handleDeleteLink = async () => {
    if (!selectedLink) return

    try {
      await adminApi.deleteLink(selectedLink.id)
      
      // Update local state
      const updatedLinks = links.filter((link) => link.id !== selectedLink.id)
      setLinks(updatedLinks)
      setIsDeleteDialogOpen(false)
      setSelectedLink(null)
    } catch (error) {
      console.error("Failed to delete link:", error)
      alert("Failed to delete link. Please try again.")
    }
  }

  const handleBulkDelete = async () => {
    try {
      // Delete each selected link
      for (const linkId of selectedLinks) {
        await adminApi.deleteLink(linkId)
      }
      
      // Update local state
      const updatedLinks = links.filter((link) => !selectedLinks.includes(link.id))
      setLinks(updatedLinks)
      setSelectedLinks([])
    } catch (error) {
      console.error("Failed to delete links:", error)
      alert("Failed to delete some links. Please try again.")
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLinks(filteredLinks.map((link) => link.id))
    } else {
      setSelectedLinks([])
    }
  }

  const handleSelectLink = (linkId: string, checked: boolean) => {
    if (checked) {
      setSelectedLinks([...selectedLinks, linkId])
    } else {
      setSelectedLinks(selectedLinks.filter((id) => id !== linkId))
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getShortUrl = (link: AdminLink) => {
    const domain = link.custom_domain || "short.ly"
    return `https://${domain}/${link.short_code}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const uniqueUsers = Array.from(new Set(links.map((link) => link.user_id))).map((userId) => {
    const link = links.find((l) => l.user_id === userId)
    return { id: userId, name: link?.user_name || "", email: link?.user_email || "" }
  })

  const handleExport = () => {
    const exportData = {
      links: filteredLinks.map(link => ({
        id: link.id,
        title: link.title || 'Untitled',
        shortCode: link.short_code,
        originalUrl: link.original_url,
        user: link.user_name,
        userEmail: link.user_email,
        status: link.is_active ? 'Active' : 'Inactive',
        clicks: link.click_count,
        createdAt: link.created_at,
        expiresAt: link.expires_at
      })),
      exportDate: new Date().toISOString(),
      totalLinks: filteredLinks.length,
      activeLinks: filteredLinks.filter(l => l.is_active).length,
      totalClicks: filteredLinks.reduce((sum, link) => sum + link.click_count, 0)
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `links-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Link Management</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage all shortened links across users</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {selectedLinks.length > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete} className="w-full sm:w-auto">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedLinks.length})
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Links</CardTitle>
            <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{links.length}</div>
            <p className="text-xs text-muted-foreground">All shortened links</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Links</CardTitle>
            <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{links.filter((l) => l.is_active).length}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Clicks</CardTitle>
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{links.reduce((sum, link) => sum + link.click_count, 0)}</div>
            <p className="text-xs text-muted-foreground">All time clicks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Unique Users</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{uniqueUsers.length}</div>
            <p className="text-xs text-muted-foreground">Link creators</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search links, titles, or users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
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
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {uniqueUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Links List Section */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Links ({filteredLinks.length})</CardTitle>
            <CardDescription className="text-sm">Manage and monitor all shortened links</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Loading links...</p>
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ExternalLink className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2" />
                <p className="text-sm">No links found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
                        {link.title?.charAt(0).toUpperCase() || "L"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{link.title || "Untitled Link"}</div>
                        <div className="text-sm text-muted-foreground truncate">{getShortUrl(link)}</div>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={link.is_active ? "default" : "secondary"}>
                          {link.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <div className="text-sm font-medium">{link.click_count} clicks</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{link.user_name}</div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => copyToClipboard(getShortUrl(link))}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(getShortUrl(link), "_blank")}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedLink(link)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedLink(link)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Link
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Link Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Link</DialogTitle>
            <DialogDescription>Update link information and settings</DialogDescription>
          </DialogHeader>
          {selectedLink && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={selectedLink.title || ""}
                  onChange={(e) => setSelectedLink({ ...selectedLink, title: e.target.value })}
                  placeholder="Link title"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={selectedLink.description || ""}
                  onChange={(e) => setSelectedLink({ ...selectedLink, description: e.target.value })}
                  placeholder="Link description"
                />
              </div>
              <div>
                <Label htmlFor="edit-original-url">Original URL</Label>
                <Input
                  id="edit-original-url"
                  value={selectedLink.original_url}
                  onChange={(e) => setSelectedLink({ ...selectedLink, original_url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-short-code">Short Code</Label>
                <Input
                  id="edit-short-code"
                  value={selectedLink.short_code}
                  onChange={(e) => setSelectedLink({ ...selectedLink, short_code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-expires-at">Expiration Date (Optional)</Label>
                <Input
                  id="edit-expires-at"
                  type="datetime-local"
                  value={selectedLink.expires_at ? selectedLink.expires_at.slice(0, 16) : ""}
                  onChange={(e) =>
                    setSelectedLink({
                      ...selectedLink,
                      expires_at: e.target.value ? e.target.value + ":00Z" : undefined,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsEditDialogOpen(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Link Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Link</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this link? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedLink && (
            <Alert>
              <AlertDescription>
                <strong>{selectedLink.title || "Untitled Link"}</strong> ({getShortUrl(selectedLink)}) and all
                associated analytics data will be permanently deleted.
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLink}>
              Delete Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={isAnalyticsDialogOpen} onOpenChange={setIsAnalyticsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Link Analytics</DialogTitle>
            <DialogDescription>Detailed analytics for {selectedLink?.title || "this link"}</DialogDescription>
          </DialogHeader>
          {selectedLink && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Clicks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedLink.click_count}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Created</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">{formatDate(selectedLink.created_at)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Last Clicked</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      {selectedLink.last_clicked ? formatDate(selectedLink.last_clicked) : "Never"}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="mx-auto h-12 w-12 mb-2" />
                <p>Detailed analytics charts would be displayed here</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsAnalyticsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
