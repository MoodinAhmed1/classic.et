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
      // Mock data for now - replace with actual API call
      const mockLinks: AdminLink[] = [
        {
          id: "1",
          user_id: "user1",
          user_name: "John Doe",
          user_email: "john.doe@example.com",
          original_url: "https://www.example.com/very-long-url-that-needs-shortening",
          short_code: "abc123",
          title: "Example Website",
          description: "A sample website for demonstration",
          is_active: true,
          click_count: 245,
          created_at: "2024-01-15T10:30:00Z",
          updated_at: "2024-01-20T14:45:00Z",
          last_clicked: "2024-01-25T09:15:00Z",
        },
        {
          id: "2",
          user_id: "user2",
          user_name: "Jane Smith",
          user_email: "jane.smith@example.com",
          original_url: "https://github.com/user/repository",
          short_code: "gh456",
          custom_domain: "custom.ly",
          title: "GitHub Repository",
          is_active: true,
          expires_at: "2024-12-31T23:59:59Z",
          click_count: 89,
          created_at: "2024-01-10T08:20:00Z",
          updated_at: "2024-01-22T16:30:00Z",
          last_clicked: "2024-01-24T11:45:00Z",
        },
        {
          id: "3",
          user_id: "user3",
          user_name: "Bob Wilson",
          user_email: "bob.wilson@example.com",
          original_url: "https://docs.google.com/document/d/1234567890",
          short_code: "doc789",
          title: "Important Document",
          is_active: false,
          click_count: 12,
          created_at: "2024-01-05T12:15:00Z",
          updated_at: "2024-01-18T10:20:00Z",
          last_clicked: "2024-01-20T15:30:00Z",
        },
        {
          id: "4",
          user_id: "user1",
          user_name: "John Doe",
          user_email: "john.doe@example.com",
          original_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          short_code: "yt999",
          title: "YouTube Video",
          is_active: true,
          click_count: 1567,
          created_at: "2024-01-12T14:45:00Z",
          updated_at: "2024-01-21T09:10:00Z",
          last_clicked: "2024-01-25T13:20:00Z",
        },
      ]
      setLinks(mockLinks)
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
      const updatedLinks = links.map((link) =>
        link.id === linkId ? { ...link, is_active: !link.is_active, updated_at: new Date().toISOString() } : link,
      )
      setLinks(updatedLinks)
    } catch (error) {
      console.error("Failed to toggle link status:", error)
    }
  }

  const handleDeleteLink = async () => {
    if (!selectedLink) return

    try {
      const updatedLinks = links.filter((link) => link.id !== selectedLink.id)
      setLinks(updatedLinks)
      setIsDeleteDialogOpen(false)
      setSelectedLink(null)
    } catch (error) {
      console.error("Failed to delete link:", error)
    }
  }

  const handleBulkDelete = async () => {
    try {
      const updatedLinks = links.filter((link) => !selectedLinks.includes(link.id))
      setLinks(updatedLinks)
      setSelectedLinks([])
    } catch (error) {
      console.error("Failed to delete links:", error)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Link Management</h2>
          <p className="text-muted-foreground">Manage all shortened links across users</p>
        </div>
        <div className="flex gap-2">
          {selectedLinks.length > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedLinks.length})
            </Button>
          )}
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{links.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{links.filter((l) => l.is_active).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {links.reduce((sum, link) => sum + link.click_count, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Links</CardTitle>
            <EyeOff className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{links.filter((l) => !l.is_active).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Search Links</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by title, URL, code, or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="user-filter">User</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={fetchLinks}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links Table */}
      <Card>
        <CardHeader>
          <CardTitle>Links ({filteredLinks.length})</CardTitle>
          <CardDescription>Manage shortened links and their analytics</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedLinks.length === filteredLinks.length && filteredLinks.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Link Details</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLinks.includes(link.id)}
                        onCheckedChange={(checked) => handleSelectLink(link.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{link.title || "Untitled Link"}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono bg-muted px-2 py-1 rounded text-xs">{getShortUrl(link)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(getShortUrl(link))}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[300px]">{link.original_url}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          {link.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{link.user_name}</div>
                          <div className="text-xs text-muted-foreground">{link.user_email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {link.is_active ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {link.expires_at && new Date(link.expires_at) < new Date() && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{link.click_count.toLocaleString()}</span>
                      </div>
                      {link.last_clicked && (
                        <div className="text-xs text-muted-foreground">Last: {formatDate(link.last_clicked)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(link.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
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
                            Copy Short URL
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedLink(link)
                              setIsAnalyticsDialogOpen(true)
                            }}
                          >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleStatus(link.id)}>
                            {link.is_active ? (
                              <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && filteredLinks.length === 0 && (
            <div className="text-center py-8">
              <ExternalLink className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">No links found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || statusFilter !== "all" || userFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "No links have been created yet."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
