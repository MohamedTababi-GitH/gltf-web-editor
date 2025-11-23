import { useCallback, useEffect, useState } from "react";
import type { SavedComponentState } from "@/features/ModelViewer/utils/StateSaver.ts";
import { isMesh } from "@/features/ModelViewer/utils/ModelUtils.ts";
import { useModel } from "@/shared/contexts/ModelContext.tsx";
import { useAxiosConfig } from "@/shared/services/AxiosConfig.ts";
import type { StateFile } from "@/shared/types/StateFile.ts";
import { Group, type Object3D } from "three";

export function isSavedStateArray(
  data: unknown,
): data is SavedComponentState[] {
  if (!Array.isArray(data)) {
    return false;
  }

  if (data.length > 0) {
    const item = data[0];
    return (
      typeof item === "object" &&
      item !== null &&
      "name" in item &&
      "position" in item &&
      "rotation" in item &&
      "scale" in item &&
      "visible" in item &&
      "opacity" in item
    );
  }

  return true;
}

type SceneRestorationProps = {
  selectedVersion: StateFile | undefined;
  setSelectedVersion: (version: StateFile | undefined) => void;
  scene: Group;
};
export const useSceneRestoration = ({
  selectedVersion,
  setSelectedVersion,
  scene,
}: Readonly<SceneRestorationProps>) => {
  const [loadedState, setLoadedState] = useState<SavedComponentState[]>();
  const { model } = useModel();
  const apiClient = useAxiosConfig();
  const handleLoadScene = useCallback(async (): Promise<void> => {
    const files = model?.stateFiles;
    if (!files || files.length === 0) {
      return;
    }
    const sortedFiles = [...files].sort((a, b) =>
      a.createdOn > b.createdOn ? -1 : 1,
    );

    const versionExists =
      selectedVersion?.version === "Original"
        ? true
        : sortedFiles.some((file) => file.version === selectedVersion?.version);
    const versionToLoad = versionExists ? selectedVersion : sortedFiles[0];
    setSelectedVersion(versionToLoad);

    if (!versionToLoad?.url) {
      console.error("Latest state file has no valid URL.");
      return;
    }

    const loadFromUrl = async () => {
      try {
        const response = await apiClient.get(versionToLoad.url, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
        const jsonString = response.data;

        try {
          const parsedData: unknown =
            typeof jsonString === "string"
              ? JSON.parse(jsonString)
              : jsonString;

          if (isSavedStateArray(parsedData)) {
            setLoadedState(parsedData);
          } else {
            console.error(
              "Loaded file is not a valid scene state:",
              parsedData,
            );
          }
        } catch (parseError) {
          console.error("Failed to parse JSON:", parseError, jsonString);
        }
      } catch (fetchError) {
        console.error("Failed to fetch state file:", fetchError);
      }
    };

    await loadFromUrl();
  }, [apiClient, model?.stateFiles, selectedVersion, setSelectedVersion]);

  useEffect(() => {
    handleLoadScene().then(() => {});
  }, [handleLoadScene]);
  useEffect(() => {
    if (!loadedState || !scene) {
      return;
    }

    for (const savedComponent of loadedState) {
      const componentToLoad = scene.getObjectByName(savedComponent.name);

      if (componentToLoad) {
        componentToLoad.position.fromArray(savedComponent.position);

        componentToLoad.rotation.fromArray([
          savedComponent.rotation[0],
          savedComponent.rotation[1],
          savedComponent.rotation[2],
          "YXZ",
        ]);

        componentToLoad.scale.fromArray(savedComponent.scale);
        componentToLoad.visible = savedComponent.visible;

        componentToLoad.traverse((child: Object3D) => {
          if (isMesh(child)) {
            const mat = child.material;
            if (Array.isArray(mat)) {
              for (const m of mat) {
                m.transparent = savedComponent.opacity < 1;
                m.opacity = savedComponent.opacity;
                m.needsUpdate = true;
              }
            } else {
              mat.transparent = savedComponent.opacity < 1;
              mat.opacity = savedComponent.opacity;
              mat.needsUpdate = true;
            }
          }
        });
      }
    }
  }, [loadedState, scene]);
};
