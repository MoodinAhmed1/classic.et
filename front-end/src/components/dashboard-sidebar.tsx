'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, LinkIcon, Settings, Globe, Zap, LogOut, Clock, Crown, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Create Link', href: '/dashboard', icon: LinkIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Links', href: '/dashboard/links', icon: LinkIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Subscription', href: '/dashboard/subscription', icon: Crown },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'premium': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 dark:bg-slate-950 text-white">
      {/* Logo */}
      <div className="flex items-center px-4 sm:px-6 py-4 border-b border-slate-700 dark:border-slate-800">
        <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
        <span className="ml-2 text-lg sm:text-xl font-bold">LinkShort</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 sm:px-4 py-4 sm:py-6 space-y-1 sm:space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => isMobile && setIsMobileMenuOpen(false)}
              className={`flex items-center px-2 sm:px-3 py-2 sm:py-2.5 text-sm font-medium rounded-md transition-colors ${
                pathname === item.href
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-slate-700 dark:border-slate-800 p-3 sm:p-4">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs sm:text-sm font-medium">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-white truncate">
              {user?.name || user?.email?.split('@')[0] || 'User'}
            </p>
            <Badge className={`text-xs ${getTierColor(user?.tier || 'free')}`}>
              {user?.tier?.toUpperCase() || 'FREE'}
            </Badge>
          </div>
        </div>

        {/* Session Timer */}
        <div className="flex items-center text-xs text-slate-400 mb-3 sm:mb-4">
          <Clock className="h-3 w-3 mr-1" />
          <span>Session: 23h 29m</span>
        </div>

        {/* Sign Out Button */}
        <Button
          onClick={handleLogout}
          disabled={isLoggingOut}
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white text-sm"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {isLoggingOut ? 'Signing out...' : 'Sign Out'}
        </Button>
      </div>
    </div>
  );

  // Mobile version with Sheet
  if (isMobile) {
    return (
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden fixed top-4 left-4 z-50 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-80 max-w-[85vw]">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop version
  return (
    <div className="hidden md:flex flex-col w-64 bg-slate-900 dark:bg-slate-950 text-white">
      <SidebarContent />
    </div>
  );
}
