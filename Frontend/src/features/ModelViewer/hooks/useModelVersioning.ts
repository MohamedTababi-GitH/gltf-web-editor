import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { StateFile } from "@/shared/types/StateFile.ts";
import { useModel } from "@/shared/contexts/ModelContext.tsx";
import { useAxiosConfig } from "@/shared/services/AxiosConfig.ts";
import { handleSaveScene } from "@/features/ModelViewer/utils/StateSaver.ts";
import { useHistory } from "../contexts/HistoryContext";
import * as THREE from "three";
import type { SavedComponentState } from "@/features/ModelViewer/utils/StateSaver";

// A map of componentName → SavedComponentState
export type SceneState = Record<string, SavedComponentState>;

type NodeTransform = {
  position?: [number, number, number];
  rotation?: [number, number, number]; // e.g. Euler in radians
  scale?: [number, number, number];
};

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
  const [baseline, setBaseline] = useState<StateFile>();
  const [showDeleteVersionWarning, setShowDeleteVersionWarning] =
    useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { model, setModel } = useModel();
  const apiClient = useAxiosConfig();
  const { resetStacks } = useHistory();

  // *** NEW ***
  const [compareLeft, setCompareLeft] = useState<StateFile | null>(null);
  const [compareRight, setCompareRight] = useState<StateFile | null>(null);
  const [diffNodeIds, setDiffNodeIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const files = model?.stateFiles || [];
  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => (a.createdOn > b.createdOn ? -1 : 1)),
    [files],
  );

  useEffect(() => {
    if (!model) return;
    setBaseline({
      name: model.baseline?.name || "baseline.json",
      version: "Original",
      createdOn: model.baseline?.createdOn || model.createdOn,
      url: model.baseline?.url || model.url,
      sizeBytes: model.baseline?.sizeBytes ?? model.sizeBytes ?? 0,
      contentType: model.baseline?.contentType ?? "application/json",
    });
  }, [model]);

  useEffect(() => {
    if (sortedFiles.length > 0 && !selectedVersion) {
      setSelectedVersion(sortedFiles[0]);
    }
  }, [sortedFiles, selectedVersion]);

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
            (file) => file.version === targetVersion,
          );
          setSelectedVersion(savedVersion);
        }
      } catch (error) {
        console.error("Error saving model:", error);
      }
    },
    [apiClient, groupRef, model?.assetId, refetchModel, resetStacks],
  );

  const handleSwitch = async () => {
    if (!versionToSwitch) return;

    if (versionToSwitch.version === "Original") {
      setSelectedVersion(baseline);
    } else {
      setSelectedVersion(versionToSwitch);
    }

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
    console.log(model.assetId);
    console.log(versionToDelete);
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

  // *** NEW ***
  const loadSceneState = useCallback(
    async (file: StateFile): Promise<SceneState> => {
      try {
        const res = await apiClient.get(file.url, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });

        const json =
          typeof res.data === "string" ? JSON.parse(res.data) : res.data;

        if (!Array.isArray(json)) {
          console.error("State JSON is not an array:", json);
          return {};
        }

        const arr = json as SavedComponentState[];

        // Convert array → map for fast lookup
        const map: SceneState = {};
        for (const item of arr) {
          map[item.name] = item;
        }

        return map;
      } catch (err) {
        console.error("Failed loading scene JSON:", err);
        return {};
      }
    },
    [apiClient],
  );

  const areTransformsDifferent = (a: NodeTransform, b: NodeTransform) => {
    const eps = 1e-4;
    const diffVec = (
      va?: [number, number, number],
      vb?: [number, number, number],
    ) => {
      if (!va && !vb) return false;
      if (!va || !vb) return true;
      return (
        Math.abs(va[0] - vb[0]) > eps ||
        Math.abs(va[1] - vb[1]) > eps ||
        Math.abs(va[2] - vb[2]) > eps
      );
    };
    if (diffVec(a.position, b.position)) return true;
    if (diffVec(a.rotation, b.rotation)) return true;
    if (diffVec(b.scale, b.scale)) return true;

    return false;
  };

  // @ts-ignore
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const computeDiffNodeIds = useCallback(
    async (left: StateFile, right: StateFile): Promise<string[]> => {
      try {
        const [leftState, rightState] = await Promise.all([
          loadSceneState(left),
          loadSceneState(right),
        ]);
        const allIds = new Set<string>([
          ...Object.keys(leftState),
          ...Object.keys(rightState),
        ]);

        const diffs: string[] = [];

        for (const id of allIds) {
          const leftNode = leftState[id] ?? {};
          const rightNode = rightState[id] ?? {};
          if (areTransformsDifferent(leftNode, rightNode)) {
            diffs.push(id);
          }
        }
        return diffs;
      } catch (e) {
        console.error("Error computing version diff:", e);
        return [];
      }
    },
  );

  const startCompare = useCallback(
    async (left: StateFile, right: StateFile) => {
      setCompareLeft(left);
      setCompareRight(right);
      const diffs = await computeDiffNodeIds(left, right);
      setDiffNodeIds(diffs);
      setIsComparing(true);
    },
    [computeDiffNodeIds],
  );

  const stopCompare = useCallback(() => {
    setIsComparing(false);
    setCompareLeft(null);
    setCompareRight(null);
    setDiffNodeIds([]);
  }, []);

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
    baseline,
    //*** NEW ***
    compareLeft,
    compareRight,
    diffNodeIds,
    isComparing,
    setIsComparing,
    setCompareLeft,
    setCompareRight,
    startCompare,
    stopCompare,
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
