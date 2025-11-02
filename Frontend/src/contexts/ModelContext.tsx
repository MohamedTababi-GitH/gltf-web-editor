import type { MeshData, ModelItem } from "@/types/ModelItem";
import {
  createContext,
  useContext,
  type ReactNode,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

interface ModelContextType {
  url: string | undefined;
  setUrl: Dispatch<SetStateAction<string | undefined>>;
  model: ModelItem | undefined;
  setModel: Dispatch<SetStateAction<ModelItem | undefined>>;
  meshes: MeshData[];
  setMeshes: Dispatch<SetStateAction<MeshData[]>>;

  // Visibility control
  toggleComponentVisibility: (
    componentId: number,
    newVisibility: boolean
  ) => void;
  setToggleComponentVisibility: Dispatch<
    SetStateAction<(id: number, visibility: boolean) => void>
  >;

  // Opacity control
  toggleComponentOpacity: (componentId: number, newOpacity: number) => void;
  setToggleComponentOpacity: Dispatch<
    SetStateAction<(id: number, opacity: number) => void>
  >;

  // Mesh position control
  updateMeshPosition: (
    id: number,
    position: { x: number; y: number; z: number }
  ) => void;
  setUpdateMeshPosition: Dispatch<
    SetStateAction<
      (id: number, position: { x: number; y: number; z: number }) => void
    >
  >;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState<string>();
  const [model, setModel] = useState<ModelItem>();
  const [meshes, setMeshes] = useState<MeshData[]>([]);

  const [toggleComponentVisibility, setToggleComponentVisibility] = useState<
    (id: number, visibility: boolean) => void
  >(() => () => {});

  const [toggleComponentOpacity, setToggleComponentOpacity] = useState<
    (id: number, opacity: number) => void
  >(() => () => {});

  const [updateMeshPosition, setUpdateMeshPosition] = useState<
    (id: number, position: { x: number; y: number; z: number }) => void
  >(() => () => {});

  return (
    <ModelContext.Provider
      value={{
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
      }}
    >
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
