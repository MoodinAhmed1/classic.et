'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Globe, Plus, CheckCircle, XCircle, Copy, Trash2, AlertCircle, Crown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { domainsApi } from '@/lib/api';

interface Domain {
  id: string;
  domain: string;
  isVerified: boolean;
  verificationToken: string;
  createdAt: string;
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.tier === 'premium') {
      fetchDomains();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchDomains = async () => {
    try {
      const { domains } = await domainsApi.getAll();
      setDomains(domains);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load domains",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      toast({
        title: "Error",
        description: "Please enter a domain name",
        variant: "destructive",
      });
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(newDomain.trim())) {
      toast({
        title: "Error",
        description: "Please enter a valid domain name",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      const domain = await domainsApi.create({ domain: newDomain.trim() });
      setDomains([domain, ...domains]);
      setNewDomain('');
      setIsDialogOpen(false);
      
      toast({
        title: "Domain added",
        description: "Your domain has been added. Please verify it to start using it.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add domain",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Verification token copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDomain = async (id: string) => {
    try {
      // This would be implemented in the API
      setDomains(domains.filter(domain => domain.id !== id));
      toast({
        title: "Domain deleted",
        description: "The domain has been removed from your account",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete domain",
        variant: "destructive",
      });
    }
  };

  if (user?.tier !== 'premium') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custom Domains</h1>
          <p className="text-gray-600 mt-2">
            Use your own domain for branded short links
          </p>
        </div>

        <Card>
          <CardContent className="text-center py-12">
            <Crown className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Premium Feature</h3>
            <p className="text-gray-600 mb-6">
              Custom domains are available for Premium users only. Upgrade your plan to use your own domain for branded short links.
            </p>
            <div className="space-y-4">
              <div className="text-sm text-gray-500">
                <p>✓ Use your own domain (e.g., short.yourcompany.com)</p>
                <p>✓ Build brand trust with custom URLs</p>
                <p>✓ Professional appearance for your links</p>
                <p>✓ SSL certificates included</p>
              </div>
              <Button>
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Premium
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custom Domains</h1>
          <p className="text-gray-600 mt-2">
            Manage your custom domains for branded short links
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Domain</DialogTitle>
              <DialogDescription>
                Add a custom domain to use for your shortened links. You'll need to verify ownership before you can use it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain Name</Label>
                <Input
                  id="domain"
                  placeholder="short.yourcompany.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the full domain name you want to use (e.g., short.yourcompany.com)
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddDomain} disabled={isAdding}>
                  {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Domain
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <span>Domain Setup Instructions</span>
          </CardTitle>
          <CardDescription>
            Follow these steps to set up your custom domain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-medium">
                  1
                </div>
                <h4 className="font-medium mb-1">Add Domain</h4>
                <p className="text-sm text-muted-foreground">
                  Add your custom domain to your account
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-medium">
                  2
                </div>
                <h4 className="font-medium mb-1">Configure DNS</h4>
                <p className="text-sm text-muted-foreground">
                  Add the required DNS records to your domain
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-medium">
                  3
                </div>
                <h4 className="font-medium mb-1">Verify</h4>
                <p className="text-sm text-muted-foreground">
                  We'll verify your domain and issue SSL certificates
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domains List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Domains ({domains.length})</CardTitle>
          <CardDescription>
            Manage your custom domains and their verification status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No domains added yet</h3>
              <p className="text-gray-600 mb-6">
                Add your first custom domain to start creating branded short links.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Domain
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((domain) => (
                    <TableRow key={domain.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span>{domain.domain}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {domain.isVerified ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="mr-1 h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(domain.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {!domain.isVerified && (
                          <div className="flex items-center space-x-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {domain.verificationToken.substring(0, 16)}...
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(domain.verificationToken)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDomain(domain.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DNS Configuration Help */}
      {domains.some(d => !d.isVerified) && (
        <Card>
          <CardHeader>
            <CardTitle>DNS Configuration</CardTitle>
            <CardDescription>
              Add these DNS records to verify your domain ownership
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Required DNS Records:</h4>
                <div className="space-y-2 text-sm font-mono">
                  <div className="grid grid-cols-4 gap-4 font-semibold">
                    <span>Type</span>
                    <span>Name</span>
                    <span>Value</span>
                    <span>TTL</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <span>CNAME</span>
                    <span>@</span>
                    <span>cname.linkshort.com</span>
                    <span>3600</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <span>TXT</span>
                    <span>_linkshort-verification</span>
                    <span>[verification-token]</span>
                    <span>3600</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Replace [verification-token] with the token shown in the verification column above. 
                DNS changes can take up to 24 hours to propagate.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
