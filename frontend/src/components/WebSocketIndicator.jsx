/**
 * WebSocket Connection Indicator
 * Shows real-time connection status to users
 */
import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const WebSocketIndicator = () => {
  const { isConnected, connectionError } = useWebSocket();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Live</span>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span>Disconnected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-yellow-600 text-sm">
      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
      <span>Connecting...</span>
    </div>
  );
};

export default WebSocketIndicator;
