import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
} from "axios";
import { useEffect, useRef } from "react";
import { useNotification } from "@/contexts/NotificationContext.tsx";

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

let isInterceptorAttached = false;

export function useAxiosConfig() {
  const { showNotification } = useNotification();
  const interceptorRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isInterceptorAttached) {
      interceptorRef.current = apiClient.interceptors.response.use(
        (response: AxiosResponse) => {
          if (
            response.data &&
            typeof response.data === "object" &&
            response.data.message
          ) {
            showNotification(response.data.message, "success");
          }

          return response;
        },
        (error: AxiosError) => {
          const data = error?.response?.data as {
            detail?: string;
            status?: number;
            title?: string;
          };
          const message = data?.detail || "An unexpected error occurred";

          showNotification(message, "error");

          return Promise.reject(error);
        },
      );
      isInterceptorAttached = true;

      return () => {
        if (interceptorRef.current !== null) {
          apiClient.interceptors.response.eject(interceptorRef.current);
          interceptorRef.current = null;
          isInterceptorAttached = false;
        }
      };
    }
  }, [showNotification]);

  return apiClient;
}
