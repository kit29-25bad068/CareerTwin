/**
 * CareerTwin AI - Centralized API Client
 */

// Dynamic Backend URL for separated frontend/backend deployments
const BACKEND_ORIGIN = 'https://careertwin-production.up.railway.app';
const API_BASE = `${BACKEND_ORIGIN}/api`;

const API = {
  getToken() {
    return localStorage.getItem('careertwin_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('careertwin_token', token);
    } else {
      localStorage.removeItem('careertwin_token');
    }
  },

  getUser() {
    const userStr = localStorage.getItem('careertwin_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('careertwin_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('careertwin_user');
    }
  },

  logout() {
    this.setToken(null);
    this.setUser(null);
    window.location.href = '/login.html';
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const headers = {
      ...(options.headers || {}),
    };

    // If body is NOT FormData, default to JSON
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        // Token expired or invalid
        console.warn('Session expired. Redirecting to login.');
        this.logout();
        throw new Error('Session expired. Please log in again.');
      }

      // Check if binary download (e.g. export)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'API request failed');
        }
        return data;
      } else {
        if (!response.ok) {
          throw new Error('API request failed');
        }
        return response;
      }
    } catch (error) {
      console.error(`[API Request Error] ${endpoint}:`, error.message);
      throw error;
    }
  },

  // Convenience Methods
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};

window.API = API;
