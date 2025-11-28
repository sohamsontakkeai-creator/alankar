import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { API_BASE } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook to validate user session periodically
 * Checks if user's department has been changed or user has been deleted
 * If changed/deleted, forces logout
 */
export const useSessionValidator = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const intervalRef = useRef(null);
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    // Only run validation if user is logged in
    if (!user || !user.id) {
      return;
    }

    const validateSession = async () => {
      // Prevent multiple logout attempts
      if (isLoggingOutRef.current) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/validate-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            currentDepartment: user.department
          })
        });

        // If response is not ok (404, 500, etc), user might be deleted
        if (!response.ok) {
          console.log('[SESSION VALIDATOR] User not found or error - forcing logout');
          handleLogout('Your account has been deleted or is no longer accessible.');
          return;
        }

        const data = await response.json();

        if (!data.valid) {
          // Session is invalid - force logout
          console.log('[SESSION VALIDATOR] Session invalid:', data.reason);
          
          let message = data.message || "Your account settings have been changed. Please login again.";
          
          if (data.reason === 'User not found') {
            message = "Your account has been deleted. Please contact administrator.";
          } else if (data.reason === 'Department changed') {
            message = `Your department has been changed to ${data.new_department}. Please login again.`;
          }
          
          handleLogout(message);
        }
      } catch (error) {
        console.error('[SESSION VALIDATOR] Error validating session:', error);
        // Don't logout on network errors, just log them
      }
    };

    const handleLogout = (message) => {
      if (isLoggingOutRef.current) {
        return;
      }
      
      isLoggingOutRef.current = true;
      
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Show notification
      toast({
        title: "Session Expired",
        description: message,
        variant: "destructive",
        duration: 5000
      });

      // Logout and redirect immediately
      setTimeout(() => {
        logout();
        navigate('/auth', { replace: true });
      }, 500);
    };

    // Validate immediately on mount
    validateSession();

    // Then validate every 5 seconds for faster response
    intervalRef.current = setInterval(validateSession, 5000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, logout, navigate]);

  return null;
};
