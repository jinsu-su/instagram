import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Auth State: Check URL and LocalStorage
  const initializeAuth = useCallback(() => {
    // 1. Synchronously capture tokens from URL if they exist
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('access_token');
    const cidFromUrl = params.get('customer_id');

    if (tokenFromUrl) localStorage.setItem('access_token', tokenFromUrl);
    if (cidFromUrl) localStorage.setItem('customer_id', cidFromUrl);

    // 2. Load latest values from LocalStorage
    const accessToken = localStorage.getItem('access_token');
    const customerId = localStorage.getItem('customer_id');

    if (customerId) {
        // We have a session!
        setUser({ id: customerId });
        setIsAuthenticated(true);
    } else {
        setUser(null);
        setIsAuthenticated(false);
    }
    
    setIsLoading(false);

    // 🚩 Analytics/Security: If we just captured tokens, clean the URL but stay on flow
    if (tokenFromUrl || cidFromUrl) {
        const cleanPath = window.location.pathname;
        window.history.replaceState({}, document.title, cleanPath);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = (userData) => {
    if (userData.access_token) localStorage.setItem('access_token', userData.access_token);
    if (userData.customer_id) localStorage.setItem('customer_id', userData.customer_id);
    setUser({ id: userData.customer_id });
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('customer_id');
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/'; // Hard redirect to home on logout
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshSession: initializeAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
