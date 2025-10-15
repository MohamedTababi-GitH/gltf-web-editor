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
          let message = "";

          if (
            response.data &&
            typeof response.data === "object" &&
            response.data.message
          ) {
            message = response.data.message;
          } else {
            const method = response.config.method?.toUpperCase();
            if (method === "GET") {
              return response;
            }
            switch (method) {
              case "POST":
                message = "Created successfully";
                break;
              case "PUT":
              case "PATCH":
                message = "Updated successfully";
                break;
              case "DELETE":
                message = "Deleted successfully";
                break;
              default:
                message = "Operation completed successfully";
            }
          }

          showNotification(message, "success");

          return response;
        },
        (error: AxiosError) => {
          const message =
            String(error?.response?.data) || "An unexpected error occurred";

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
