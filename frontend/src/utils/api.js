/**
 * API Utility - Adds user headers to all requests
 */

const API_BASE = import.meta.env.VITE_API_URL;

/**
 * Get user headers from session storage
 */
export const getUserHeaders = () => {
  const savedUser = sessionStorage.getItem('erpUser');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      return {
        'X-User-Name': user.fullName || '',
        'X-User-Email': user.email || '',
        'X-User-Department': user.department || ''
      };
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }
  return {};
};

/**
 * Enhanced fetch that automatically adds user headers
 */
export const apiFetch = async (url, options = {}) => {
  const userHeaders = getUserHeaders();
  
  const enhancedOptions = {
    ...options,
    headers: {
      ...userHeaders,
      ...options.headers
    }
  };
  
  return fetch(url, enhancedOptions);
};

/**
 * Get full API URL
 */
export const getApiUrl = (path) => {
  return `${API_BASE}${path}`;
};

export default {
  fetch: apiFetch,
  getUrl: getApiUrl,
  getUserHeaders
};
