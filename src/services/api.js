/**
 * API Service Layer for MyID Voice Assistant
 * Centralized API configuration and methods for frontend-backend communication
 * 
 * Phase 2: API Integration Layer
 */

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Helper function to get auth token from localStorage
 */
const getAuthToken = () => localStorage.getItem('token');

/**
 * Helper function to build headers with auth token
 */
const getHeaders = (includeAuth = false) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

/**
 * Helper function to handle API responses
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: `HTTP error! status: ${response.status}`
    }));
    throw new Error(error.detail || error.message || 'API request failed');
  }
  return response.json();
};

// ============================================
// AUTHENTICATION APIs
// ============================================

export const authAPI = {
  /**
   * Login user
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise<{access_token: string, token_type: string}>}
   */
  login: async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    return handleResponse(response);
  },

  /**
   * Register new user
   * @param {Object} userData - {username, password, email, full_name, ic_number}
   */
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    
    return handleResponse(response);
  },

  /**
   * Get current user profile
   */
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getHeaders(true),
    });
    
    return handleResponse(response);
  },
};

// ============================================
// AID PROGRAMS APIs
// ============================================

export const aidAPI = {
  /**
   * Get aid program status for user
   * @param {string} userId 
   */
  getStatus: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/aid/status/${userId}`, {
      headers: getHeaders(true),
    });
    
    return handleResponse(response);
  },

  /**
   * Check eligibility for aid program
   * @param {string} programId - Program ID (str, sara)
   * @param {Object} eligibilityData - {ic, age, state, household_size, monthly_income, employment_status}
   * @param {string} lang - Language code (en, ms, zh, ta)
   */
  checkEligibility: async (programId, eligibilityData, lang = 'en') => {
    const response = await fetch(`${API_BASE_URL}/aid/check-eligibility/${programId}?lang=${lang}`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(eligibilityData),
    });
    
    return handleResponse(response);
  },

  /**
   * Get aid balance for user
   * @param {string} userId 
   * @param {string} programId - str or sara
   */
  getBalance: async (userId, programId) => {
    const response = await fetch(`${API_BASE_URL}/aid/balance/${userId}/${programId}`, {
      headers: getHeaders(true),
    });
    
    return handleResponse(response);
  },

  /**
   * Get transaction history
   * @param {string} userId 
   * @param {string} programId 
   */
  getHistory: async (userId, programId) => {
    const response = await fetch(`${API_BASE_URL}/aid/history/${userId}/${programId}`, {
      headers: getHeaders(true),
    });
    
    return handleResponse(response);
  },
};

// ============================================
// STR APPLICATION APIs (NEW!)
// ============================================

export const strAPI = {
  /**
   * Get STR application information
   * @param {string} lang - Language code (en, ms, zh, ta)
   */
  getApplicationInfo: async (lang = 'en') => {
    const response = await fetch(`${API_BASE_URL}/str-application/application-info?lang=${lang}`);
    
    return handleResponse(response);
  },

  /**
   * Validate STR application data
   * @param {Object} applicationData - Complete STR application object
   * @param {string} lang - Language code
   */
  validateData: async (applicationData, lang = 'en') => {
    const response = await fetch(`${API_BASE_URL}/str-application/validate-data?lang=${lang}`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(applicationData),
    });
    
    return handleResponse(response);
  },

  /**
   * Prepare complete STR application
   * @param {Object} applicationData - {applicant, spouse, children, guardian}
   * @param {string} lang - Language code
   * @returns {Promise<{success, eligibility_result, estimated_amount, required_documents, next_steps, portal_url}>}
   */
  prepareApplication: async (applicationData, lang = 'en') => {
    const response = await fetch(`${API_BASE_URL}/str-application/prepare-application?lang=${lang}`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(applicationData),
    });
    
    return handleResponse(response);
  },
};

// ============================================
// STORE LOCATOR APIs
// ============================================

export const storeAPI = {
  /**
   * Find nearby SARA stores
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Search radius in km (default: 5)
   * @param {string} lang - Language code
   */
  findNearby: async (lat, lng, radius = 5, lang = 'en') => {
    const response = await fetch(`${API_BASE_URL}/stores/locate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        radius_km: radius
      }),
    });
    
    return handleResponse(response);
  },

  /**
   * Get store details by ID
   * @param {string} storeId 
   */
  getStoreDetails: async (storeId) => {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}`, {
      headers: getHeaders(),
    });
    
    return handleResponse(response);
  },
};

// ============================================
// PAYMENT APIs
// ============================================

export const paymentAPI = {
  /**
   * Generate QR code for payment
   * @param {Object} paymentData - {user_id, amount, merchant_id, description}
   */
  generateQR: async (paymentData) => {
    const response = await fetch(`${API_BASE_URL}/payment/generate-qr`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(paymentData),
    });
    
    return handleResponse(response);
  },

  /**
   * Verify payment transaction
   * @param {string} transactionId 
   */
  verifyPayment: async (transactionId) => {
    const response = await fetch(`${API_BASE_URL}/payment/verify/${transactionId}`, {
      headers: getHeaders(true),
    });
    
    return handleResponse(response);
  },
};

// ============================================
// REMINDER APIs
// ============================================

export const reminderAPI = {
  /**
   * Get reminders for user
   * @param {string} userId 
   * @param {string} lang - Language code
   */
  getReminders: async (userId, lang = 'en') => {
    const response = await fetch(`${API_BASE_URL}/reminders/${userId}?lang=${lang}`, {
      headers: getHeaders(true),
    });
    
    return handleResponse(response);
  },

  /**
   * Create new reminder
   * @param {Object} reminderData - {user_id, reminder_type, title, message, scheduled_time}
   */
  createReminder: async (reminderData) => {
    const response = await fetch(`${API_BASE_URL}/reminders`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(reminderData),
    });
    
    return handleResponse(response);
  },

  /**
   * Mark reminder as read
   * @param {string} reminderId 
   */
  markAsRead: async (reminderId) => {
    const response = await fetch(`${API_BASE_URL}/reminders/${reminderId}/read`, {
      method: 'PUT',
      headers: getHeaders(true),
    });
    
    return handleResponse(response);
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!getAuthToken();
};

/**
 * Logout user (clear token)
 */
export const logout = () => {
  localStorage.removeItem('token');
};

/**
 * Save auth token
 */
export const saveToken = (token) => {
  localStorage.setItem('token', token);
};

// ============================================
// EXPORT ALL APIs
// ============================================

export default {
  auth: authAPI,
  aid: aidAPI,
  str: strAPI,
  store: storeAPI,
  payment: paymentAPI,
  reminder: reminderAPI,
  isAuthenticated,
  logout,
  saveToken,
};
