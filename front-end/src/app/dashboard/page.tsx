import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LinkShortener } from '@/components/link-shortner';
import { RecentLinks } from '@/components/recent-links';
import { StatsOverview } from '@/components/stats-overview';

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 space-y-8 px-4">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Manage your shortened links and view analytics
        </p>
      </div>

      {/* Link Shortener */}
      <Card className="bg-white/80 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 backdrop-blur-sm shadow-lg dark:shadow-gray-900/20">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Shorten a URL</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Enter a long URL to create a shortened version
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LinkShortener />
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <Suspense fallback={
        <Card className="bg-white/80 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 backdrop-blur-sm shadow-lg dark:shadow-gray-900/20">
          <CardContent className="p-6">
            <div className="text-gray-600 dark:text-gray-300">Loading stats...</div>
          </CardContent>
        </Card>
      }>
        <StatsOverview />
      </Suspense>

      {/* Recent Links */}
      <Card className="bg-white/80 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 backdrop-blur-sm shadow-lg dark:shadow-gray-900/20">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Recent Links</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Your most recently created shortened links
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="text-gray-600 dark:text-gray-300">Loading links...</div>}>
            <RecentLinks />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
