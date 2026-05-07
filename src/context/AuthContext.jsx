import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Set default axios header if token exists
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      
      // Attempt to load user info from token (we simply set a true state for now, 
      // or we could fetch /api/auth/me if we had an endpoint)
      setUser(true);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });
    const newToken = res.data.token;
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(res.data.user);
  };

  const register = async (email, password) => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const res = await axios.post(`${API_BASE_URL}/api/auth/register`, { email, password });
    const newToken = res.data.token;
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(res.data.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
