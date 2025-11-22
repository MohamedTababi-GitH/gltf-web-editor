import type { ModelItem } from "@/shared/types/ModelItem.ts";
import {
  createContext,
  useContext,
  type ReactNode,
  useState,
  type Dispatch,
  type SetStateAction,
  useMemo,
} from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import type { MeshData } from "@/features/ModelViewer/types/MeshData.ts";

type ModelContextType = {
  url: string | undefined;
  setUrl: Dispatch<SetStateAction<string | undefined>>;
  model: ModelItem | undefined;
  setModel: Dispatch<SetStateAction<ModelItem | undefined>>;
  meshes: MeshData[];
  setMeshes: Dispatch<SetStateAction<MeshData[]>>;
  isDiffMode: boolean;
  setIsDiffMode: Dispatch<SetStateAction<boolean>>;

  // Visibility control
  toggleComponentVisibility: (
    componentId: number,
    newVisibility: CheckedState,
  ) => void;
  setToggleComponentVisibility: Dispatch<
    SetStateAction<(id: number, visibility: CheckedState) => void>
  >;

  // Opacity control
  toggleComponentOpacity: (
    componentId: number,
    newOpacity: number,
    isCommit: boolean,
    oldOpacityValue?: number,
  ) => void;
  setToggleComponentOpacity: Dispatch<
    SetStateAction<
      (
        id: number,
        opacity: number,
        isCommit: boolean,
        oldOpacityValue?: number,
      ) => void
    >
  >;

  // Mesh position control
  updateMeshPosition: (
    id: number,
    position: { x: number; y: number; z: number },
  ) => void;
  setUpdateMeshPosition: Dispatch<
    SetStateAction<
      (id: number, position: { x: number; y: number; z: number }) => void
    >
  >;
};

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { readonly children: ReactNode }) {
  const [url, setUrl] = useState<string>();
  const [model, setModel] = useState<ModelItem>();
  const [meshes, setMeshes] = useState<MeshData[]>([]);
  const [isDiffMode, setIsDiffMode] = useState<boolean>(false);

  const [toggleComponentVisibility, setToggleComponentVisibility] = useState<
    (id: number, visibility: CheckedState) => void
  >(() => () => {});

  const [toggleComponentOpacity, setToggleComponentOpacity] = useState<
    (
      id: number,
      opacity: number,
      isCommit: boolean,
      oldOpacityValue?: number,
    ) => void
  >(() => () => {});

  const [updateMeshPosition, setUpdateMeshPosition] = useState<
    (id: number, position: { x: number; y: number; z: number }) => void
  >(() => () => {});

  const memoizedValue = useMemo(
    () => ({
      url,
      setUrl,
      model,
      setModel,
      meshes,
      setMeshes,
      toggleComponentVisibility,
      setToggleComponentVisibility,
      toggleComponentOpacity,
      setToggleComponentOpacity,
      updateMeshPosition,
      setUpdateMeshPosition,
      isDiffMode,
      setIsDiffMode,
    }),
    [
      url,
      setUrl,
      model,
      setModel,
      meshes,
      setMeshes,
      toggleComponentVisibility,
      setToggleComponentVisibility,
      toggleComponentOpacity,
      setToggleComponentOpacity,
      updateMeshPosition,
      setUpdateMeshPosition,
      isDiffMode,
      setIsDiffMode,
    ],
  );

  return (
    <ModelContext.Provider value={memoizedValue}>
      {children}
    </ModelContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useModel() {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error("useModel must be used within a ModelProvider");
  }
  return context;
}
