import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { StateFile } from "@/shared/types/StateFile.ts";
import { useModel } from "@/shared/contexts/ModelContext.tsx";
import { useAxiosConfig } from "@/shared/services/AxiosConfig.ts";
import { handleSaveScene } from "@/features/ModelViewer/utils/StateSaver.ts";
import { useHistory } from "../contexts/HistoryContext";
import * as THREE from "three";

export const useModelVersioning = (
  groupRef: React.RefObject<THREE.Group | null>,
) => {
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<StateFile>();
  const [versionToSwitch, setVersionToSwitch] = useState<StateFile>();
  const [versionToDelete, setVersionToDelete] = useState<StateFile>();
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [showDeleteVersionWarning, setShowDeleteVersionWarning] =
    useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { model, setModel } = useModel();
  const apiClient = useAxiosConfig();
  const { resetStacks } = useHistory();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const files = model?.stateFiles || [];
  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => (a.createdOn > b.createdOn ? -1 : 1)),
    [files],
  );

  useEffect(() => {
    if (sortedFiles.length > 0) {
      setSelectedVersion(sortedFiles[0]);
    }
  }, [model?.id, sortedFiles]);

  const refetchModel = useCallback(async () => {
    try {
      const res = await apiClient.get(`api/model/${model?.id}`);
      setModel(res.data);
      return res.data;
    } catch (e) {
      console.error("Error fetching model:", e);
      return null;
    }
  }, [apiClient, model?.id, setModel]);

  const saveModel = useCallback(
    async (targetVersion?: string) => {
      if (!groupRef || !model?.assetId || !refetchModel) return;
      try {
        const state = handleSaveScene(groupRef);
        const formData = new FormData();
        formData.append("StateJson", state);
        if (targetVersion) {
          formData.append("TargetVersion", targetVersion);
        }
        await apiClient.post(`/api/model/${model?.assetId}/state`, formData);
        setVersionModalOpen(false);
        setVersionName("");
        resetStacks();

        const newModelData = await refetchModel();

        if (newModelData) {
          const newSortedFiles = [...newModelData.stateFiles].sort((a, b) =>
            a.createdOn > b.createdOn ? -1 : 1,
          );
          const savedVersion = newSortedFiles.find(
            (file) => file.version === (targetVersion || "Default"),
          );
          setSelectedVersion(savedVersion || newSortedFiles[0]);
        }
      } catch (error) {
        console.error("Error saving model:", error);
      }
    },
    [apiClient, groupRef, model?.assetId, refetchModel, resetStacks],
  );

  const handleSwitch = async () => {
    if (!versionToSwitch) return;
    setSelectedVersion(versionToSwitch);
    resetStacks();
    setVersionToSwitch(undefined);
    setShowSwitchWarning(false);
  };

  const handleVersionClick = (
    file: React.SetStateAction<StateFile | undefined>,
    canUndo: boolean,
  ) => {
    if (canUndo) {
      setShowSwitchWarning(true);
      setVersionToSwitch(file);
      return;
    }
    setSelectedVersion(file);
    resetStacks();
  };

  const handleDeleteVersionClick = (
    file: React.SetStateAction<StateFile | undefined>,
  ) => {
    setShowDeleteVersionWarning(true);
    setVersionToDelete(file);
  };

  const handleDeleteVersion = useCallback(async () => {
    if (!model?.assetId || !versionToDelete) return;
    try {
      setIsDeleting(true);
      await apiClient.delete(
        `/api/model/${model?.assetId}/state/${versionToDelete?.version}`,
      );
      await refetchModel();
    } catch (error) {
      console.error("Error deleting model version:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [apiClient, model?.assetId, refetchModel, versionToDelete]);

  return {
    versionModalOpen,
    setVersionModalOpen,
    versionName,
    setVersionName,
    selectedVersion,
    setSelectedVersion,
    showSwitchWarning,
    setShowSwitchWarning,
    showCloseWarning,
    setShowCloseWarning,
    showDeleteVersionWarning,
    setShowDeleteVersionWarning,
    saveModel,
    handleSwitch,
    handleVersionClick,
    handleDeleteVersion,
    sortedFiles,
    handleDeleteVersionClick,
    switchWarningDialogProps: {
      showSwitchWarning,
      setShowSwitchWarning,
      handleSwitch,
      selectedVersion,
      saveModel,
    },
    closeWarningDialogProps: {
      showCloseWarning,
      setShowCloseWarning,
      saveModel,
      selectedVersion,
    },
    saveVersionDialogProps: {
      versionModalOpen,
      setVersionModalOpen,
      versionName,
      setVersionName,
      saveModel,
    },
    deleteVersionDialogProps: {
      showDeleteVersionWarning,
      setShowDeleteVersionWarning,
      handleDeleteVersion,
      isDeleting,
      versionToDelete,
    },
  };
};
