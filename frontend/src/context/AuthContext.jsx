import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [activeRole, setActiveRole] = useState(localStorage.getItem('activeRole') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const res = await API.get('/auth/me');
      if (res.data.success) {
        const userData = res.data.user;
        setUser(userData);
        if (!activeRole || !userData.roles.includes(activeRole)) {
          const defaultRole = userData.roles[0];
          setActiveRole(defaultRole);
          localStorage.setItem('activeRole', defaultRole);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (usernameInput, password) => {
    try {
      const res = await API.post('/auth/login', { username: usernameInput, password });
      if (res.data.success) {
        const { token: newToken, user: userData } = res.data;
        localStorage.setItem('token', newToken);
        localStorage.setItem('activeRole', userData.roles[0]);
        setToken(newToken);
        setUser(userData);
        setActiveRole(userData.roles[0]);
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Invalid username or password' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeRole');
    setToken(null);
    setUser(null);
    setActiveRole(null);
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      const res = await API.post('/auth/change-password', { currentPassword, newPassword, confirmPassword });
      if (res.data.success) {
        setUser(prev => prev ? { ...prev, forcePasswordChange: false } : null);
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to update password' };
    }
  };

  const switchRole = (newRole) => {
    if (user && user.roles.includes(newRole)) {
      setActiveRole(newRole);
      localStorage.setItem('activeRole', newRole);
    }
  };

  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes('*') || user.permissions.includes(permission);
  };

  const hasRole = (role) => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeRole,
        loading,
        login,
        logout,
        changePassword,
        switchRole,
        hasPermission,
        hasRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
