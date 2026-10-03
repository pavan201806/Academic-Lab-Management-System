import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate and load user profile on startup if token exists
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const data = await authService.getMe();
        if (isMounted && data?.user) {
          setUser(data.user);
          setToken(storedToken);
        }
      } catch (err) {
        // Token invalid or expired
        if (isMounted) {
          localStorage.removeItem('auth_token');
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (rollNumber, password) => {
    setError(null);
    try {
      const response = await authService.login(rollNumber, password);
      const { token: newToken, user: authUser } = response;

      localStorage.setItem('auth_token', newToken);
      setToken(newToken);
      setUser(authUser);
      return { success: true, user: authUser };
    } catch (err) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    setError(null);
    try {
      const response = await authService.changePassword(
        currentPassword,
        newPassword,
        confirmPassword
      );
      const { token: newToken, user: updatedUser } = response;

      if (newToken) {
        localStorage.setItem('auth_token', newToken);
        setToken(newToken);
      }
      if (updatedUser) {
        setUser(updatedUser);
      }
      return { success: true, user: updatedUser };
    } catch (err) {
      const msg = err.message || 'Failed to update password. Please check your inputs.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      setToken(null);
      setError(null);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    mustChangePassword: !!user?.mustChangePassword,
    loading,
    error,
    setError,
    login,
    changePassword,
    logout
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
