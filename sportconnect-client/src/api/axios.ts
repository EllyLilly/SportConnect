import axios from 'axios';

const api = axios.create({
  baseURL: 'https://localhost:7055/api',
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          'https://localhost:7055/api/auth/refresh',
          {},
          { withCredentials: true }
        );

        const newAccessToken = response.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        // Нет редиректа для гостя, чтобы он просматривал карту без входа
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;