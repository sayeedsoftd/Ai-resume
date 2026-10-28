import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  
  // View mode switcher: 'user' | 'admin' | 'recruiter'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('viewMode') || 'user';
  });

  const fetchUser = async () => {
    try {
      if (localStorage.getItem('token')) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to load current user:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    localStorage.setItem('token', data.access_token);
    setToken(data.access_token);
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
    
    // Set appropriate initial view mode based on role
    if (currentUser.role === 'SUPER_ADMIN') {
      setViewMode('admin');
      localStorage.setItem('viewMode', 'admin');
    } else if (currentUser.role === 'SUBSCRIBER') {
      setViewMode('user');
      localStorage.setItem('viewMode', 'user');
    } else {
      setViewMode('user');
      localStorage.setItem('viewMode', 'user');
    }

    return currentUser;
  };

  const googleLogin = async (credentialOrToken) => {
    const data = await authService.googleLogin(credentialOrToken);
    localStorage.setItem('token', data.access_token);
    setToken(data.access_token);
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
    return currentUser;
  };

  const register = async (userData) => {
    await authService.register(userData);
    return await login(userData.email, userData.password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('viewMode');
    setToken(null);
    setUser(null);
    setViewMode('user');
  };

  const switchViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const role = user?.role || 'GUEST';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isSubscriber = role === 'SUBSCRIBER';
  const isNormalUser = role === 'NORMAL_USER';
  const isVerified = Boolean(user?.is_verified_badge);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        googleLogin,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        role,
        isSuperAdmin,
        isSubscriber,
        isNormalUser,
        isVerified,
        viewMode,
        switchViewMode,
      }}
    >
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
