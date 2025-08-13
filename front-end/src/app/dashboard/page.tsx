'use client';

import { StatsOverview } from '@/components/stats-overview';
import { RecentLinks } from '@/components/recent-links';
import { LinkShortener } from '@/components/link-shortner';
import { UsageWarning } from '@/components/usage-warning';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your shortened links and view analytics
        </p>
      </div>

      {/* Usage Warning */}
      <UsageWarning />

      {/* Link Shortener */}
      <LinkShortener />

      {/* Stats Overview */}
      <StatsOverview />

      {/* Recent Links */}
      <RecentLinks />
    </div>
  );
}
