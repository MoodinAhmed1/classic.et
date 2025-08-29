'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Plus, Copy, ExternalLink, BarChart3, MoreHorizontal, Edit, Trash2, Filter, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { linksApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LinkData {
  id: string;
  shortCode: string;
  originalUrl: string;
  title: string | null;
  clickCount: number;
  createdAt: string;
  isActive: boolean;
  expiresAt: string | null;
}

export default function LinksPage() {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<LinkData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkData | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchLinks();
  }, []);

  useEffect(() => {
    // Filter links based on search query
    const filtered = links.filter(link => 
      link.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.originalUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.shortCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredLinks(filtered);
  }, [links, searchQuery]);

  const fetchLinks = async () => {
    try {
      const { links } = await linksApi.getAll({ limit: 1000 });
      setLinks(links);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load links",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (shortCode: string) => {
    try {
      const shortUrl = `${window.location.origin}/${shortCode}`;
      await navigator.clipboard.writeText(shortUrl);
      toast({
        title: "Copied!",
        description: "Short URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await linksApi.delete(id);
      setLinks(links.filter(link => link.id !== id));
      toast({
        title: "Success",
        description: "Link deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete link",
        variant: "destructive",
      });
    }
  };

  const handleShowQR = (link: LinkData) => {
    setSelectedLink(link);
    setShowQRModal(true);
  };

  const generateQRCode = (url: string) => {
    // Simple QR code generation using a service
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  const getShortUrl = (shortCode: string) => {
    // Fix: Redirect to backend instead of frontend
    return `https://back-end.xayrix1.workers.dev/${shortCode}`;
  };

  const isExpired = (expiresAt: string | null) => {
    return expiresAt && new Date(expiresAt) < new Date();
  };

  const truncateUrl = (url: string, maxLength = 50) => {
    return url.length > maxLength ? `${url.substring(0, maxLength)}...` : url;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:space-y-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Links</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
            Manage all your shortened links in one place
          </p>
        </div>
        <Link href="/dashboard" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create Link
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search links by title, URL, or short code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Links Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">All Links ({filteredLinks.length})</CardTitle>
          <CardDescription className="text-sm">
            View and manage your shortened links
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 sm:space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-gray-400 mb-4 text-sm sm:text-base">
                {searchQuery ? 'No links match your search' : 'No links created yet'}
              </div>
              {!searchQuery && (
                <Link href="/dashboard">
                  <Button>Create Your First Link</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Title</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Original URL</TableHead>
                    <TableHead className="text-xs sm:text-sm">Short URL</TableHead>
                    <TableHead className="text-xs sm:text-sm text-center">Clicks</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">Created</TableHead>
                    <TableHead className="text-xs sm:text-sm text-center">Status</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        <div className="max-w-[120px] sm:max-w-[200px] truncate">
                          {link.title || 'Untitled'}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="max-w-[200px] lg:max-w-[300px] truncate text-xs sm:text-sm">
                          {link.originalUrl}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs sm:text-sm">
                          {getShortUrl(link.shortCode)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs sm:text-sm">
                        {link.clickCount}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs sm:text-sm">
                        {new Date(link.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 justify-center">
                          {!link.isActive && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                          {isExpired(link.expiresAt) && (
                            <Badge variant="destructive" className="text-xs">Expired</Badge>
                          )}
                          {link.isActive && !isExpired(link.expiresAt) && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => copyToClipboard(link.shortCode)}>
                              <Copy className="mr-2 h-4 w-4" />
                              <span>Copy URL</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(getShortUrl(link.shortCode), '_blank')}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              <span>Visit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShowQR(link)}>
                              <QrCode className="mr-2 h-4 w-4" />
                              <span>QR Code</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/links/${link.id}`)}>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              <span>Analytics</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/links/${link.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(link.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      {showQRModal && selectedLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">QR Code</h3>
              <img 
                src={generateQRCode(getShortUrl(selectedLink.shortCode))} 
                alt="QR Code" 
                className="mx-auto mb-4"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {getShortUrl(selectedLink.shortCode)}
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowQRModal(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => copyToClipboard(selectedLink.shortCode)}
                  className="flex-1"
                >
                  Copy URL
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
