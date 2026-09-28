import axios from 'axios';

const API = axios.create({
  baseURL: '/api'
});

// Attach JWT bearer token and role headers
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const activeRole = localStorage.getItem('activeRole');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (activeRole) {
    config.headers['X-Role-Used'] = activeRole;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercept 401 unauthenticated errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
