import { useEffect, useRef, useState } from 'react';
import refreshEvents from '@/utils/refreshEvents';

/**
 * Custom hook for auto-refreshing data without interrupting user input
 * 
 * @param {Function} fetchFunction - Function to call for refreshing data
 * @param {number} interval - Refresh interval in milliseconds (default: 5000ms = 5 seconds)
 * @param {Object} options - Additional options
 * @param {boolean} options.enabled - Whether auto-refresh is enabled (default: true)
 * @param {boolean} options.pauseOnInput - Pause refresh when user is typing (default: true)
 * @param {string|Array<string>} options.refreshTopics - Topics to listen for manual refresh triggers
 * @returns {Object} - { isRefreshing, lastRefreshTime, pauseRefresh, resumeRefresh, triggerRefresh }
 */
export const useAutoRefresh = (fetchFunction, interval = 5000, options = {}) => {
  const { enabled = true, pauseOnInput = true, refreshTopics = [] } = options;
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  
  const intervalRef = useRef(null);
  const userActivityRef = useRef(false);
  const lastActivityTimeRef = useRef(Date.now());

  // Detect user input activity
  useEffect(() => {
    if (!pauseOnInput) return;

    const handleUserActivity = (e) => {
      // Detect if user is typing in input fields, textareas, or contenteditable elements
      const isInputElement = 
        e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.isContentEditable ||
        e.target.closest('[contenteditable="true"]') ||
        e.target.closest('input') ||
        e.target.closest('textarea');

      if (isInputElement) {
        userActivityRef.current = true;
        lastActivityTimeRef.current = Date.now();
      }
    };

    // Listen for keyboard and mouse events
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('input', handleUserActivity);
    document.addEventListener('focus', handleUserActivity, true);

    return () => {
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('input', handleUserActivity);
      document.removeEventListener('focus', handleUserActivity, true);
    };
  }, [pauseOnInput]);

  // Reset user activity flag after 2 seconds of inactivity
  useEffect(() => {
    const checkActivityInterval = setInterval(() => {
      if (userActivityRef.current && Date.now() - lastActivityTimeRef.current > 2000) {
        userActivityRef.current = false;
      }
    }, 1000);

    return () => clearInterval(checkActivityInterval);
  }, []);

  // Auto-refresh logic
  useEffect(() => {
    if (!enabled || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const refresh = async () => {
      // Skip refresh if user is actively typing
      if (userActivityRef.current) {
        console.log('Auto-refresh paused: user is typing');
        return;
      }

      try {
        setIsRefreshing(true);
        await fetchFunction();
        setLastRefreshTime(new Date());
      } catch (error) {
        console.error('Auto-refresh error:', error);
      } finally {
        setIsRefreshing(false);
      }
    };

    // Set up interval
    intervalRef.current = setInterval(refresh, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchFunction, interval, enabled, isPaused]);

  // Listen for manual refresh triggers via event system
  useEffect(() => {
    if (!refreshTopics || refreshTopics.length === 0) return;

    const topics = Array.isArray(refreshTopics) ? refreshTopics : [refreshTopics];
    const unsubscribers = topics.map(topic => 
      refreshEvents.subscribe(topic, async () => {
        console.log(`Manual refresh triggered for topic: ${topic}`);
        try {
          setIsRefreshing(true);
          await fetchFunction();
          setLastRefreshTime(new Date());
        } catch (error) {
          console.error('Manual refresh error:', error);
        } finally {
          setIsRefreshing(false);
        }
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [refreshTopics, fetchFunction]);

  const pauseRefresh = () => setIsPaused(true);
  const resumeRefresh = () => setIsPaused(false);
  
  // Manual trigger function
  const triggerRefresh = async () => {
    if (userActivityRef.current) {
      console.log('Manual refresh skipped: user is typing');
      return;
    }
    
    try {
      setIsRefreshing(true);
      await fetchFunction();
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Manual refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    isRefreshing,
    lastRefreshTime,
    pauseRefresh,
    resumeRefresh,
    triggerRefresh,
    isPaused
  };
};

export default useAutoRefresh;
