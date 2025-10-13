import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
} from "axios";
import { useEffect, useRef } from "react";
import { useNotification } from "@/contexts/NotificationContext.tsx";

// Create a singleton instance
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

// Track if interceptor is already set
let isInterceptorAttached = false;

export function useAxiosConfig() {
  const { showNotification } = useNotification();
  const interceptorRef = useRef<number | null>(null);

  useEffect(() => {
    // Only attach the interceptor once across all components
    if (!isInterceptorAttached) {
      // Add interceptor for error handling
      // Store interceptor ID for cleanup
      interceptorRef.current = apiClient.interceptors.response.use(
        (response: AxiosResponse) => {
          console.log(response);

          // Get message from response if available
          let message = "";

          if (
            response.data &&
            typeof response.data === "object" &&
            response.data.message
          ) {
            message = response.data.message;
          } else {
            // Generate default message based on request method if no message in response
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

          // Show notification
          showNotification(message, "success");

          return response;
        },
        (error: AxiosError) => {
          // Extract error message from response if available
          const message =
            String(error?.response?.data) || "An unexpected error occurred";

          // Show notification using our service
          showNotification(message, "error");

          // Continue with the error rejection
          return Promise.reject(error);
        },
      );
      isInterceptorAttached = true;

      // Cleanup on component unmount
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
