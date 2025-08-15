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
import { Search, Plus, Copy, ExternalLink, BarChart3, MoreHorizontal, Edit, Trash2, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Links</h1>
          <p className="text-gray-600 mt-2">
            Manage all your shortened links in one place
          </p>
        </div>
        <Link href="/dashboard">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create Link
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
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
          <CardTitle>All Links ({filteredLinks.length})</CardTitle>
          <CardDescription>
            View and manage your shortened links
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
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
                    <TableHead>Title</TableHead>
                    <TableHead>Original URL</TableHead>
                    <TableHead>Short Code</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">
                        {link.title || 'Untitled'}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <a 
                            href={link.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                            title={link.originalUrl}
                          >
                            {truncateUrl(link.originalUrl)}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {link.shortCode}
                        </code>
                      </TableCell>
                      <TableCell>{link.clickCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {link.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          {isExpired(link.expiresAt) && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(link.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(link.shortCode)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(getShortUrl(link.shortCode), '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/dashboard/links/${link.id}`)}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/links/${link.id}`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(link.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
