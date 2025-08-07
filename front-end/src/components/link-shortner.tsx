'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Copy, ExternalLink, Loader2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { linksApi } from '@/lib/api';

interface ShortenedLink {
  id: string;
  shortCode: string;
  originalUrl: string;
  title: string | null;
  clickCount: number;
  createdAt: string;
  isActive: boolean;
}

export function LinkShortener() {
  const [url, setUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [title, setTitle] = useState('');
  const [useCustomCode, setUseCustomCode] = useState(false);
  const [useExpiration, setUseExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ShortenedLink | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const canUseCustomCode = user?.tier !== 'free';
  const canUseExpiration = user?.tier === 'pro' || user?.tier === 'premium';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a URL",
        variant: "destructive",
      });
      return;
    }

    if (useCustomCode && !canUseCustomCode) {
      toast({
        title: "Upgrade Required",
        description: "Custom codes require Pro or Premium plan",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const data = {
        originalUrl: url.trim(),
        ...(useCustomCode && customCode.trim() && { customCode: customCode.trim() }),
        ...(title.trim() && { title: title.trim() }),
        ...(useExpiration && expirationDate && { expiresAt: new Date(expirationDate).toISOString() }),
      };

      const result = await linksApi.create(data);
      setResult(result);
      
      // Reset form
      setUrl('');
      setCustomCode('');
      setTitle('');
      setUseCustomCode(false);
      setUseExpiration(false);
      setExpirationDate('');
      
      toast({
        title: "Success!",
        description: "Your link has been shortened",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to shorten URL",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
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

  const getShortUrl = (shortCode: string) => {
    return `https://back-end.xayrix1.workers.dev/${shortCode}`;
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">Long URL *</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://example.com/very/long/url"
            value={url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title (Optional)</Label>
          <Input
            id="title"
            placeholder="Custom title for your link"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        {/* Custom Code Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="custom-code"
              checked={useCustomCode}
              onCheckedChange={setUseCustomCode}
              disabled={!canUseCustomCode || isLoading}
            />
            <Label htmlFor="custom-code" className="flex items-center space-x-2">
              <span>Use custom short code</span>
              {!canUseCustomCode && (
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                  Pro/Premium only
                </span>
              )}
            </Label>
          </div>
          
          {useCustomCode && (
            <Input
              placeholder="my-custom-code"
              value={customCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomCode(e.target.value)}
              disabled={isLoading}
              maxLength={20}
            />
          )}
        </div>

        {/* Expiration Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="expiration"
              checked={useExpiration}
              onCheckedChange={setUseExpiration}
              disabled={!canUseExpiration || isLoading}
            />
            <Label htmlFor="expiration" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Set expiration date</span>
              {!canUseExpiration && (
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                  Pro/Premium only
                </span>
              )}
            </Label>
          </div>
          
          {useExpiration && (
            <Input
              type="datetime-local"
              value={expirationDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpirationDate(e.target.value)}
              disabled={isLoading}
              min={new Date().toISOString().slice(0, 16)}
            />
          )}
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Shorten URL
        </Button>
      </form>

      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Short URL</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={getShortUrl(result.shortCode)}
                    readOnly
                    className="bg-white"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(getShortUrl(result.shortCode))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getShortUrl(result.shortCode), '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Original:</strong> {result.originalUrl}</p>
                {result.title && <p><strong>Title:</strong> {result.title}</p>}
                <p><strong>Created:</strong> {new Date(result.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
