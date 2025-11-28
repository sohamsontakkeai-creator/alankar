/**
 * React Hook for WebSocket Integration
 * Provides easy-to-use WebSocket functionality in React components
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import websocketManager from '../utils/websocket';

/**
 * Hook to manage WebSocket connection
 */
export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (token && !websocketManager.isConnected) {
      websocketManager.connect(token);
    }

    // Subscribe to connection status
    const unsubscribeStatus = websocketManager.on('connection_status', (data) => {
      setIsConnected(data.connected);
      if (!data.connected) {
        setConnectionError(data.reason);
      } else {
        setConnectionError(null);
      }
    });

    const unsubscribeFailed = websocketManager.on('connection_failed', (data) => {
      setConnectionError(data.error);
    });

    // Setup ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      websocketManager.ping();
    }, 30000); // Ping every 30 seconds

    return () => {
      unsubscribeStatus();
      unsubscribeFailed();
      clearInterval(pingInterval);
    };
  }, []);

  return {
    isConnected,
    connectionError,
    disconnect: () => websocketManager.disconnect()
  };
};

/**
 * Hook to subscribe to specific WebSocket events
 */
export const useWebSocketEvent = (eventName, callback, dependencies = []) => {
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const wrappedCallback = (data) => {
      callbackRef.current(data);
    };

    const unsubscribe = websocketManager.on(eventName, wrappedCallback);

    return () => {
      unsubscribe();
    };
  }, [eventName, ...dependencies]);
};

/**
 * Hook for order updates
 */
export const useOrderUpdates = (onUpdate) => {
  useWebSocketEvent('order_update', onUpdate);
};

/**
 * Hook for approval requests
 */
export const useApprovalRequests = (onRequest) => {
  useWebSocketEvent('approval_request', onRequest);
};

/**
 * Hook for approval decisions
 */
export const useApprovalDecisions = (onDecision) => {
  useWebSocketEvent('approval_decision', onDecision);
};

/**
 * Hook for inventory alerts
 */
export const useInventoryAlerts = (onAlert) => {
  useWebSocketEvent('inventory_alert', onAlert);
};

/**
 * Hook for leave requests
 */
export const useLeaveRequests = (onRequest) => {
  useWebSocketEvent('leave_request', onRequest);
};

/**
 * Hook for tour requests
 */
export const useTourRequests = (onRequest) => {
  useWebSocketEvent('tour_request', onRequest);
};

/**
 * Hook for payment updates
 */
export const usePaymentUpdates = (onUpdate) => {
  useWebSocketEvent('payment_update', onUpdate);
};

/**
 * Hook for dispatch updates
 */
export const useDispatchUpdates = (onUpdate) => {
  useWebSocketEvent('dispatch_update', onUpdate);
};

/**
 * Hook for production updates
 */
export const useProductionUpdates = (onUpdate) => {
  useWebSocketEvent('production_update', onUpdate);
};

/**
 * Hook for guest updates
 */
export const useGuestUpdates = (onUpdate) => {
  useWebSocketEvent('guest_update', onUpdate);
};

/**
 * Hook for system alerts
 */
export const useSystemAlerts = (onAlert) => {
  const [alerts, setAlerts] = useState([]);

  useWebSocketEvent('system_alert', (data) => {
    setAlerts(prev => [...prev, data]);
    if (onAlert) {
      onAlert(data);
    }
  });

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const removeAlert = useCallback((index) => {
    setAlerts(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    alerts,
    clearAlerts,
    removeAlert
  };
};

/**
 * Hook to show toast notifications for WebSocket events
 */
export const useWebSocketNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  // Subscribe to all notification events
  useWebSocketEvent('approval_request', (data) => {
    addNotification('info', `New ${data.approval_type} approval request`);
  });

  useWebSocketEvent('approval_decision', (data) => {
    const type = data.decision === 'approved' ? 'success' : 'error';
    addNotification(type, `Your ${data.approval_type} request was ${data.decision}`);
  });

  useWebSocketEvent('inventory_alert', (data) => {
    addNotification('warning', `Inventory Alert: ${data.alert_type}`);
  });

  useWebSocketEvent('system_alert', (data) => {
    addNotification(data.severity, data.message);
  });

  const addNotification = (type, message) => {
    const notification = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    removeNotification
  };
};
