import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const userData = authService.getUser();
          setUser(userData);
        } catch (error) {
          console.error('Auth check failed:', error);
          authService.logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setUser(data.admin);
    return data;
  };

  const loginCustomer = async (email, password) => {
    const data = await authService.loginCustomer(email, password);
    setUser(data.user || null);
    return data;
  };

  const registerCustomer = async (details) => {
    const data = await authService.registerCustomer(details);
    setUser(data.user || null);
    return data;
  };

  const verifyCustomerContacts = async (details) => {
    const data = await authService.verifyCustomerContacts(details);
    if (data.user) setUser(data.user);
    return data;
  };

  const loginAgent = async (email, password) => {
    const data = await authService.loginAgent(email, password);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      loginCustomer,
      registerCustomer,
      verifyCustomerContacts,
      loginAgent,
      logout,
      loading,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};