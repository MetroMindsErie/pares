import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api', // Set your API base URL here
});

// Intercept each request to attach the token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken'); // Get token from localStorage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
