import { useAxiosConfig } from "@/shared/services/AxiosConfig.ts";

export const useMutex = () => {
  const apiClient = useAxiosConfig();

  const lockModel = async (modelId: string) => {
    try {
      await apiClient.post(`/api/model/${modelId}/lock`);
      return { success: true };
    } catch {
      return {
        success: false,
      };
    }
  };

  const unlockModel = async (modelId: string) => {
    try {
      await apiClient.post(`/api/model/${modelId}/unlock`);
      return { success: true };
    } catch {
      return { success: false };
    }
  };

  const heartbeat = async (modelId: string) => {
    try {
      await apiClient.post(`/api/model/${modelId}/heartbeat`);
      return { success: true };
    } catch (error) {
      console.log(error);
      return { success: false };
    }
  };

  return { lockModel, unlockModel, heartbeat };
};
