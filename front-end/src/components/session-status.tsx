'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { sessionStorage } from '@/lib/session-storage';
import { Clock, AlertCircle } from 'lucide-react';

export function SessionStatus() {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!user) return;

    const updateTimeLeft = () => {
      const remaining = sessionStorage.getTimeRemaining();
      
      if (remaining <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [user]);

  if (!user || !timeLeft) return null;

  const isExpiringSoon = timeLeft.includes('m') && parseInt(timeLeft) < 30;

  return (
    <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
      {isExpiringSoon ? (
        <AlertCircle className="h-3 w-3 text-orange-500" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      <span className={isExpiringSoon ? 'text-orange-600 dark:text-orange-400' : ''}>
        Session: {timeLeft}
      </span>
    </div>
  );
} 