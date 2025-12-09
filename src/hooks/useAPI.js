/**
 * Custom React Hook for API calls
 * Provides easy-to-use hooks for all backend APIs with loading/error states
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Generic hook for API calls with loading and error handling
 * @param {Function} apiFunc - The API function to call
 * @param {Array} dependencies - Dependencies for useEffect
 */
export const useAPI = (apiFunc, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunc(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, dependencies);

  return { data, loading, error, execute };
};

/**
 * Hook for STR application
 */
export const useSTRApplication = (lang = 'en') => {
  const [applicationData, setApplicationData] = useState({
    applicant: {},
    spouse: null,
    children: [],
    guardian: {}
  });
  
  const { data: appInfo, loading: infoLoading, error: infoError } = useAPI(
    () => api.str.getApplicationInfo(lang),
    [lang]
  );

  const { execute: validateData, loading: validating, error: validationError } = useAPI(
    (data) => api.str.validateData(data, lang)
  );

  const { execute: submitApplication, loading: submitting, error: submitError } = useAPI(
    (data) => api.str.prepareApplication(data, lang)
  );

  useEffect(() => {
    api.str.getApplicationInfo(lang)
      .then(setApplicationData)
      .catch(console.error);
  }, [lang]);

  return {
    applicationData,
    setApplicationData,
    appInfo,
    infoLoading,
    infoError,
    validateData,
    validating,
    validationError,
    submitApplication,
    submitting,
    submitError,
  };
};

/**
 * Hook for aid programs
 */
export const useAidPrograms = (userId, lang = 'en') => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      api.aid.getStatus(userId)
        .then(setStatus)
        .catch(setError)
        .finally(() => setLoading(false));
    }
  }, [userId]);

  const checkEligibility = async (programId, eligibilityData) => {
    try {
      setLoading(true);
      const result = await api.aid.checkEligibility(programId, eligibilityData, lang);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { status, loading, error, checkEligibility };
};

/**
 * Hook for store locator
 */
export const useStoreLocator = (lang = 'en') => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const findNearbyStores = async (lat, lng, radius = 5) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🗺️ Finding stores at:', { lat, lng, radius, lang });
      const result = await api.store.findNearby(lat, lng, radius, lang);
      console.log('🗺️ Store API response:', result);
      const storesData = result.data || result.stores || [];
      console.log('🗺️ Stores found:', storesData.length, storesData);
      setStores(storesData);
      return result;
    } catch (err) {
      console.error('🗺️ Store API error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { stores, loading, error, findNearbyStores };
};

/**
 * Hook for authentication
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    if (api.isAuthenticated()) {
      api.auth.getProfile()
        .then(setUser)
        .catch(() => api.logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.auth.login(username, password);
      // Backend returns { token, user_id, name } not { access_token }
      if (result.token) {
        api.saveToken(result.token);
      } else if (result.access_token) {
        api.saveToken(result.access_token);
      }
      // Set user from login response or fetch profile
      if (result.name && result.user_id) {
        setUser({ name: result.name, user_id: result.user_id });
        return result;
      }
      const profile = await api.auth.getProfile();
      setUser(profile);
      return profile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.auth.register(userData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: api.isAuthenticated(),
  };
};

/**
 * Hook for reminders
 */
export const useReminders = (userId, lang = 'en') => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReminders = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const result = await api.reminder.getReminders(userId, lang);
      // Backend returns { data: [...] }, frontend expects { reminders: [...] }
      setReminders(result.data || result.reminders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, lang]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const markAsRead = async (reminderId) => {
    try {
      await api.reminder.markAsRead(userId, reminderId, lang);
      await fetchReminders(); // Refresh list
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { reminders, loading, error, markAsRead, refresh: fetchReminders };
};

export default {
  useAPI,
  useSTRApplication,
  useAidPrograms,
  useStoreLocator,
  useAuth,
  useReminders,
};
