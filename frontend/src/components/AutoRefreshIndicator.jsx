import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Visual indicator for auto-refresh status
 * Shows a small badge when auto-refresh is active
 */
export const AutoRefreshIndicator = ({ isRefreshing, lastRefreshTime, isPaused }) => {
  if (isPaused) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <RefreshCw 
        className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-blue-500' : 'text-gray-400'}`} 
      />
      <span>
        {isRefreshing ? 'Refreshing...' : lastRefreshTime ? `Updated ${formatTimeAgo(lastRefreshTime)}` : 'Auto-refresh active'}
      </span>
    </div>
  );
};

const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

export default AutoRefreshIndicator;
