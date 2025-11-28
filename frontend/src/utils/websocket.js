/**
 * WebSocket Client Manager
 * Handles real-time communication with backend via Socket.IO
 */
import { io } from 'socket.io-client';

class WebSocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventHandlers = new Map();
  }

  /**
   * Connect to WebSocket server
   */
  connect(token) {
    if (this.socket && this.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    this.socket = io(BACKEND_URL, {
      auth: { token },
      query: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts
    });

    this.setupEventListeners();
  }

  /**
   * Setup default event listeners
   */
  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('connected', (data) => {
      console.log('✅ Server confirmed connection:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.emit('connection_failed', { error: 'Max reconnection attempts reached' });
      }
    });

    this.socket.on('pong', (data) => {
      // Keep-alive response
    });

    // Setup event listeners for all real-time events
    this.setupBusinessEventListeners();
  }

  /**
   * Setup business-specific event listeners
   */
  setupBusinessEventListeners() {
    // Order updates
    this.socket.on('order_update', (data) => {
      console.log('📦 Order update received:', data);
      this.emit('order_update', data);
    });

    // Approval requests
    this.socket.on('approval_request', (data) => {
      console.log('✋ Approval request received:', data);
      this.emit('approval_request', data);
    });

    // Approval decisions
    this.socket.on('approval_decision', (data) => {
      console.log('✅ Approval decision received:', data);
      this.emit('approval_decision', data);
    });

    // Inventory alerts
    this.socket.on('inventory_alert', (data) => {
      console.log('📊 Inventory alert received:', data);
      this.emit('inventory_alert', data);
    });

    // Leave requests
    this.socket.on('leave_request', (data) => {
      console.log('🏖️ Leave request received:', data);
      this.emit('leave_request', data);
    });

    // Tour requests
    this.socket.on('tour_request', (data) => {
      console.log('🚗 Tour request received:', data);
      this.emit('tour_request', data);
    });

    // Payment updates
    this.socket.on('payment_update', (data) => {
      console.log('💰 Payment update received:', data);
      this.emit('payment_update', data);
    });

    // Dispatch updates
    this.socket.on('dispatch_update', (data) => {
      console.log('🚚 Dispatch update received:', data);
      this.emit('dispatch_update', data);
    });

    // Production updates
    this.socket.on('production_update', (data) => {
      console.log('🏭 Production update received:', data);
      this.emit('production_update', data);
    });

    // Guest updates
    this.socket.on('guest_update', (data) => {
      console.log('👤 Guest update received:', data);
      this.emit('guest_update', data);
    });

    // System alerts
    this.socket.on('system_alert', (data) => {
      console.log('🔔 System alert received:', data);
      this.emit('system_alert', data);
    });
  }

  /**
   * Subscribe to an event
   */
  on(eventName, callback) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName).push(callback);

    // Return unsubscribe function
    return () => this.off(eventName, callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(eventName, callback) {
    if (!this.eventHandlers.has(eventName)) return;
    
    const handlers = this.eventHandlers.get(eventName);
    const index = handlers.indexOf(callback);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit event to all subscribers
   */
  emit(eventName, data) {
    if (!this.eventHandlers.has(eventName)) return;
    
    const handlers = this.eventHandlers.get(eventName);
    handlers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for ${eventName}:`, error);
      }
    });
  }

  /**
   * Send ping to keep connection alive
   */
  ping() {
    if (this.socket && this.isConnected) {
      this.socket.emit('ping');
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventHandlers.clear();
      console.log('WebSocket disconnected');
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create singleton instance
const websocketManager = new WebSocketManager();

export default websocketManager;
