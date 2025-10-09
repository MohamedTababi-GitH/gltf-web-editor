import axios, { type AxiosInstance } from "axios";
import { useNotification } from "@/contexts/NotificationContext.tsx";

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

export function useAxiosConfig() {
  const { showNotification } = useNotification();

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      const message = error.response?.data || "An unexpected error occurred";
      const code = error.response?.status || 500;
      showNotification("Error " + code + ": " + message, "error");
      return Promise.reject(error);
    },
  );

  return apiClient;
}
