'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, ArrowUpRight, X } from 'lucide-react';
import { subscriptionApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface UsageWarningProps {
  onClose?: () => void;
}

export function UsageWarning({ onClose }: UsageWarningProps) {
  const [usageData, setUsageData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      const data = await subscriptionApi.getUsage();
      setUsageData(data);
    } catch (error) {
      console.error('Failed to fetch usage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (isLoading || !isVisible || !usageData) {
    return null;
  }

  // Check if any usage is above 80%
  const isNearLimit = 
    usageData.limits.links.percentage >= 80 ||
    usageData.limits.visitors.percentage >= 80;

  // Check if any usage is at 100%
  const isAtLimit = 
    usageData.limits.links.percentage >= 100 ||
    usageData.limits.visitors.percentage >= 100;

  // Don't show warning for Premium users
  if (usageData?.plan?.tier === 'premium') {
    return null;
  }

  if (!isNearLimit && !isAtLimit) {
    return null;
  }

  const getWarningColor = () => {
    if (isAtLimit) return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
    return 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20';
  };

  const getWarningIcon = () => {
    if (isAtLimit) return 'text-red-600 dark:text-red-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const getWarningTitle = () => {
    if (isAtLimit) return 'Usage Limit Reached';
    return 'Approaching Usage Limit';
  };

  const getWarningMessage = () => {
    if (isAtLimit) {
      return 'You have reached your monthly limit. Upgrade your plan to continue creating links and tracking visitors.';
    }
    return 'You are approaching your monthly usage limit. Consider upgrading your plan.';
  };

  return (
    <Card className={`border ${getWarningColor()}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 sm:gap-3 flex-1">
            <AlertTriangle className={`h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0 ${getWarningIcon()}`} />
            <div className="flex-1 min-w-0">
              <h4 className={`font-medium text-sm sm:text-base ${isAtLimit ? 'text-red-900 dark:text-red-100' : 'text-orange-900 dark:text-orange-100'}`}>
                {getWarningTitle()}
              </h4>
              <p className={`text-xs sm:text-sm mt-1 ${isAtLimit ? 'text-red-700 dark:text-red-300' : 'text-orange-700 dark:text-orange-300'}`}>
                {getWarningMessage()}
              </p>
              
              <div className="mt-2 sm:mt-3 space-y-2">
                {usageData.limits.links.percentage >= 80 && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Links Created</span>
                      <span className="text-right">{usageData.limits.links.current} / {usageData.limits.links.limit === -1 ? 'Unlimited' : usageData.limits.links.limit}</span>
                    </div>
                    <Progress 
                      value={usageData.limits.links.percentage} 
                      className="h-1.5" 
                    />
                  </div>
                )}
                
                {usageData.limits.visitors.percentage >= 80 && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Visitors Tracked</span>
                      <span className="text-right">{usageData.limits.visitors.current} / {usageData.limits.visitors.limit === null ? 'Unlimited' : usageData.limits.visitors.limit}</span>
                    </div>
                    <Progress 
                      value={usageData.limits.visitors.percentage} 
                      className="h-1.5" 
                    />
                  </div>
                )}
              </div>
              
              <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Link href="/dashboard/subscription" className="flex-1">
                  <Button 
                    size="sm" 
                    className={`w-full text-xs sm:text-sm ${isAtLimit ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                  >
                    <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Upgrade Plan
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleClose}
                  className="text-xs sm:text-sm"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


