import React from 'react';
import Link from 'next/link';

const RecentActivity = ({ activities, isLoading }) => {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : !Array.isArray(activities) || activities.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">No recent activity yet.</div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => {
              const Row = (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
                  <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg">
                    {activity.icon || '•'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-gray-900 dark:text-gray-100 truncate">{activity.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {activity.time}{activity.subtitle ? ` • ${activity.subtitle}` : ''}
                    </div>
                  </div>
                  {activity.href ? (
                    <div className="shrink-0 text-xs text-teal-600 dark:text-teal-400">View</div>
                  ) : null}
                </div>
              );

              return activity.href ? (
                <Link key={activity.key} href={activity.href} className="block hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded-lg">
                  {Row}
                </Link>
              ) : (
                <div key={activity.key}>{Row}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;
