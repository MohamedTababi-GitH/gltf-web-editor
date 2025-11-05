import { useAxiosConfig } from "@/services/AxiosConfig";
import axios from "axios";

export const useMutexApi = () => {
  const apiClient = useAxiosConfig();

  const lockModel = async (modelId: string) => {
    try {
      await apiClient.post(`/api/model/${modelId}/lock`);
      return { success: true };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          return { success: false, message: error.response.data.message };
        }
      }
      console.error("Lock request failed:", error);
      return {
        success: false,
        message: "Unexpected error while locking model.",
      };
    }
  };

  const unlockModel = async (modelId: string) => {
    try {
      await apiClient.post(`/api/model/${modelId}/unlock`);
    } catch (error) {
      console.warn("Unlock failed:", error);
    }
  };

  return { lockModel, unlockModel };
};
