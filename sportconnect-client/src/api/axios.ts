import axios from 'axios';

//Один экземпляр axios для всех запросов
const api = axios.create({
  baseURL: 'https://localhost:7055/api',
  withCredentials: true // чтобы браузер отправлял cookie с refresh-токеном
});

//перед каждым запросом добавляется access-токен
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Интерцептор: если ответ 401 — токен обновляется
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если ошибка 401 и это не повторный запрос
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        //попытка обновить токен
        const response = await axios.post(
          'https://localhost:7055/api/auth/refresh',
          {},
          { withCredentials: true }
        );

        const newAccessToken = response.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);

        // Повтор запроса с новым токеном
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        // Если обновить не удалось - разлогин
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;