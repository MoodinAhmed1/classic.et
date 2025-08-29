'use client';

import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import  {ProtectedRoute}  from '@/components/protected-route';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 transition-colors duration-300">
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto relative w-full">
          {/* Profile Header - Positioned Absolutely */}
          <DashboardHeader />
          
          {/* Main Content */}
          <div className="p-3 sm:p-4 md:p-6 lg:p-8 pt-16 sm:pt-20 md:pt-24">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
