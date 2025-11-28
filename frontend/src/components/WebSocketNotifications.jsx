/**
 * WebSocket Notifications Component
 * Displays toast notifications for real-time events
 */
import React from 'react';
import { useWebSocketNotifications } from '../hooks/useWebSocket';

const WebSocketNotifications = () => {
  const { notifications, removeNotification } = useWebSocketNotifications();

  if (notifications.length === 0) return null;

  const getNotificationStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
      default:
        return 'bg-blue-500 text-white';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getNotificationStyles(notification.type)} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[400px] animate-slide-in`}
        >
          <span className="text-xl font-bold">
            {getNotificationIcon(notification.type)}
          </span>
          <span className="flex-1">{notification.message}</span>
          <button
            onClick={() => removeNotification(notification.id)}
            className="text-white hover:text-gray-200 font-bold"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default WebSocketNotifications;
