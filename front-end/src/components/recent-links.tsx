'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, BarChart3, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LinkIcon } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { linksApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface Link {
  id: string;
  shortCode: string;
  originalUrl: string;
  title: string | null;
  clickCount: number;
  createdAt: string;
  isActive: boolean;
  expiresAt: string | null;
}

interface RecentLinksProps {
  limit?: number;
}

export function RecentLinks({ limit = 10 }: RecentLinksProps) {
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchLinks();
  }, [limit]);

  const fetchLinks = async () => {
    try {
      const { links } = await linksApi.getAll({ limit });
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
      const shortUrl = `https://back-end.xayrix1.workers.dev/${shortCode}`;
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
    return `https://back-end.xayrix1.workers.dev/${shortCode}`;
  };

  const isExpired = (expiresAt: string | null) => {
    return expiresAt && new Date(expiresAt) < new Date();
  };

  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-3 sm:p-4 border rounded-lg animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white mb-2">No links yet</h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Create your first shortened link above!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {links.map((link) => (
        <div
          key={link.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex-1 min-w-0 mb-3 sm:mb-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1 sm:mb-2">
              <h3 className="font-medium truncate text-sm sm:text-base">
                {link.title || 'Untitled'}
              </h3>
              <div className="flex items-center space-x-1 mt-1 sm:mt-0">
                {!link.isActive && (
                  <Badge variant="secondary" className="text-xs">Inactive</Badge>
                )}
                {isExpired(link.expiresAt) && (
                  <Badge variant="destructive" className="text-xs">Expired</Badge>
                )}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground truncate mb-1 sm:mb-2">
              {link.originalUrl}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs text-muted-foreground">
              <span className="font-mono break-all sm:break-normal">{getShortUrl(link.shortCode)}</span>
              <span>{link.clickCount} clicks</span>
              <span>{new Date(link.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(link.shortCode)}
              className="h-8 px-2 sm:px-3 text-xs"
            >
              <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(getShortUrl(link.shortCode), '_blank')}
              className="h-8 px-2 sm:px-3 text-xs"
            >
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Visit</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
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
          </div>
        </div>
      ))}
    </div>
  );
}
