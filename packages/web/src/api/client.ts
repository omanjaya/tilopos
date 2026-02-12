import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/lib/toast-utils';

// Flag to prevent multiple concurrent 401 handlers from triggering multiple logout
let isLoggingOut = false;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000, // 30 seconds
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Cegah multiple logout dari concurrent requests
      if (!isLoggingOut) {
        isLoggingOut = true;
        toast.warning({
          title: 'Sesi berakhir',
          description: 'Silakan login kembali',
        });
        // Delay 2 detik agar user bisa lihat toast
        setTimeout(() => {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          isLoggingOut = false;
        }, 2000);
      }
    }
    return Promise.reject(error);
  },
);
