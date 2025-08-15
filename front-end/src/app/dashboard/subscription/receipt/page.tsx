'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, Home, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TransactionData {
  plan: string;
  amount: number;
  reference: string;
  status: string;
}

export default function ReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const txRef = searchParams.get('tx_ref');

  useEffect(() => {
    if (!txRef) {
      setError('No transaction reference found');
      setLoading(false);
      return;
    }

    // Verify the transaction
    verifyTransaction(txRef);
  }, [txRef]);

  const verifyTransaction = async (reference: string) => {
    try {
      // Here you would typically verify the transaction with your backend
      // For now, we'll simulate the verification
      setTransactionData({
        plan: 'Pro Plan',
        amount: 9.99,
        reference: reference,
        status: 'Success'
      });
      setLoading(false);
    } catch (err) {
      setError('Failed to verify transaction');
      setLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (txRef) {
      // Create the Chapa receipt URL
      const chapaReceiptUrl = `https://checkout.chapa.co/checkout/test-payment-receipt/${txRef}`;
      
      // Open the receipt in a new tab for download
      window.open(chapaReceiptUrl, '_blank');
      
      toast({
        title: "Receipt Download",
        description: "Opening Chapa receipt in new tab",
      });
    }
  };

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  const handleContinue = () => {
    router.push('/dashboard/subscription');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying transaction...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={handleGoHome}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {transactionData && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium">{transactionData.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">${transactionData.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-medium font-mono text-sm">{transactionData.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-green-600">{transactionData.status}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleDownloadReceipt} 
              className="w-full"
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Receipt
            </Button>
            
            <Button onClick={handleGoHome} className="w-full" variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
            
            <Button onClick={handleContinue} className="w-full">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
