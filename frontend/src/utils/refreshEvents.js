/**
 * Global refresh event system
 * Allows components to trigger refreshes in other components when actions occur
 * 
 * Example: When HR creates an employee, trigger refresh in all HR-related components
 */

class RefreshEventManager {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to refresh events for a specific topic
   * @param {string} topic - The topic to listen to (e.g., 'hr', 'inventory', 'orders')
   * @param {Function} callback - Function to call when refresh is triggered
   * @returns {Function} Unsubscribe function
   */
  subscribe(topic, callback) {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    
    this.listeners.get(topic).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(topic);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(topic);
        }
      }
    };
  }

  /**
   * Trigger a refresh for all subscribers of a topic
   * @param {string} topic - The topic to trigger
   * @param {Object} data - Optional data to pass to subscribers
   */
  trigger(topic, data = {}) {
    const callbacks = this.listeners.get(topic);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in refresh callback for topic "${topic}":`, error);
        }
      });
    }
  }

  /**
   * Trigger multiple topics at once
   * @param {Array<string>} topics - Array of topics to trigger
   * @param {Object} data - Optional data to pass to subscribers
   */
  triggerMultiple(topics, data = {}) {
    topics.forEach(topic => this.trigger(topic, data));
  }

  /**
   * Clear all listeners (useful for cleanup)
   */
  clear() {
    this.listeners.clear();
  }

  /**
   * Get count of listeners for a topic
   * @param {string} topic - The topic to check
   * @returns {number} Number of listeners
   */
  getListenerCount(topic) {
    return this.listeners.get(topic)?.size || 0;
  }
}

// Create singleton instance
const refreshEvents = new RefreshEventManager();

// Export singleton
export default refreshEvents;

// Common topic constants for consistency
export const REFRESH_TOPICS = {
  // HR related
  HR_EMPLOYEES: 'hr.employees',
  HR_ATTENDANCE: 'hr.attendance',
  HR_LEAVES: 'hr.leaves',
  HR_PAYROLL: 'hr.payroll',
  HR_RECRUITMENT: 'hr.recruitment',
  
  // Inventory/Store
  INVENTORY: 'inventory',
  STORE_ORDERS: 'store.orders',
  
  // Production
  PRODUCTION_ORDERS: 'production.orders',
  PRODUCTION_STATUS: 'production.status',
  
  // Purchase
  PURCHASE_ORDERS: 'purchase.orders',
  PURCHASE_REQUESTS: 'purchase.requests',
  
  // Assembly
  ASSEMBLY_ORDERS: 'assembly.orders',
  ASSEMBLY_STATUS: 'assembly.status',
  
  // Showroom
  SHOWROOM_PRODUCTS: 'showroom.products',
  SHOWROOM_ORDERS: 'showroom.orders',
  
  // Finance
  FINANCE_INVOICES: 'finance.invoices',
  FINANCE_PAYMENTS: 'finance.payments',
  
  // Sales
  SALES_ORDERS: 'sales.orders',
  SALES_CUSTOMERS: 'sales.customers',
  
  // Transport
  TRANSPORT_DELIVERIES: 'transport.deliveries',
  TRANSPORT_VEHICLES: 'transport.vehicles',
  
  // Security/Watchman
  SECURITY_ENTRIES: 'security.entries',
  SECURITY_PASSES: 'security.passes',
  
  // Admin
  ADMIN_USERS: 'admin.users',
  ADMIN_APPROVALS: 'admin.approvals',
  
  // Global
  ALL: 'global.all', // Triggers refresh everywhere
};

/**
 * Helper hook for using refresh events in React components
 * Usage:
 * 
 * import { useRefreshEvents, REFRESH_TOPICS } from '@/utils/refreshEvents';
 * 
 * const MyComponent = () => {
 *   const { subscribe, trigger } = useRefreshEvents();
 *   
 *   useEffect(() => {
 *     // Subscribe to refresh events
 *     const unsubscribe = subscribe(REFRESH_TOPICS.HR_EMPLOYEES, () => {
 *       fetchEmployees();
 *     });
 *     
 *     return unsubscribe; // Cleanup on unmount
 *   }, []);
 *   
 *   const handleCreate = async () => {
 *     await createEmployee();
 *     // Trigger refresh in all subscribed components
 *     trigger(REFRESH_TOPICS.HR_EMPLOYEES);
 *   };
 * };
 */
export const useRefreshEvents = () => {
  return {
    subscribe: refreshEvents.subscribe.bind(refreshEvents),
    trigger: refreshEvents.trigger.bind(refreshEvents),
    triggerMultiple: refreshEvents.triggerMultiple.bind(refreshEvents),
  };
};
