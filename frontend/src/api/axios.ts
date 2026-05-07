import axios from 'axios';

// En production, VITE_API_URL pointe vers Railway ; en dev, fallback sur localhost
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // JWT envoyé dans Authorization header, pas dans les cookies
});

// Request interceptor — attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('medecin_nom');
      localStorage.removeItem('medecin_prenom');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
