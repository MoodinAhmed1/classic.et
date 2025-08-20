'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, Home, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { subscriptionApi } from '@/lib/api';
import jsPDF from 'jspdf';

interface TransactionData {
  plan: string;
  amount: number;
  reference: string;
  status: string;
  currency?: string;
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

    verifyTransaction(txRef);
  }, [txRef]);

  const verifyTransaction = async (reference: string) => {
    try {
      // Kick off server-side verification for tx_ref and capture amount/currency
      const verify = await subscriptionApi.verifyTransaction(reference);

      // Poll for ref_id saved by callback_url
      const start = Date.now();
      let refId: string | null = null;
      let status: string | null = null;
      while (Date.now() - start < 15000) { // up to 15s
        const res = await subscriptionApi.getRefByTxRef(reference);
        refId = res.refId;
        status = res.status;
        if (refId) break;
        await new Promise(r => setTimeout(r, 1500));
      }

      setTransactionData({
        plan: 'Subscription',
        amount: Number((verify as any)?.amount ?? 0),
        reference: refId || reference,
        status: ((status as any) || verify?.status || 'processing').toString().toUpperCase(),
        currency: (verify as any)?.currency || 'ETB'
      });
      setLoading(false);
    } catch (err) {
      setError('Failed to verify transaction');
      setLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    const refId = transactionData?.reference || txRef || '';
    if (!refId) {
      toast({ title: 'Receipt', description: 'Missing reference id', variant: 'destructive' as any });
      return;
    }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 80, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Payment Receipt', 40, 50);

    // Company/brand name
    doc.setFontSize(12);
    doc.text('LinkShort', pageWidth - 120, 50);

    // Body
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);

    let y = 120;
    const line = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 40, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 180, y);
      y += 26;
    };

    const dateStr = new Date().toLocaleString();
    line('Reference (ref_id)', refId);
    line('Status', transactionData?.status || '');
    line('Amount', `${transactionData?.amount ?? ''} ${transactionData?.currency ?? ''}`.trim());
    line('Plan', transactionData?.plan || 'Subscription');
    line('Date', dateStr);

    // Divider
    doc.setDrawColor(220, 220, 220);
    doc.line(40, y + 10, pageWidth - 40, y + 10);
    y += 40;

    // Signature block
    doc.setFont('helvetica', 'bold');
    doc.text('Authorized Signature', 40, y);
    y += 50;
    doc.setFont('times', 'italic');
    doc.setFontSize(22);
    doc.text('LinkShort', 40, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('Digitally signed by LinkShort', 40, y + 18);

    // Footer
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(10);
    doc.text('Thank you for your purchase!', 40, 780);

    doc.save(`receipt_${refId}.pdf`);
    toast({ title: 'Receipt Download', description: 'PDF receipt generated' });
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
                <span className="font-medium">{transactionData.amount} {transactionData.currency || ''}</span>
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
