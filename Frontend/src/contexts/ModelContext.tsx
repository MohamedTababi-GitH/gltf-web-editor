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

  // NEW: The function AppSidebar will call to toggle visibility
  toggleComponentVisibility: (
    componentId: number,
    newVisibility: boolean,
  ) => void; //new

  // NEW: The setter Model.tsx will call to provide the implementation
  setToggleComponentVisibility: Dispatch<
    SetStateAction<(id: number, visibility: boolean) => void>
  >;

  // NEW: Opacity control
  toggleComponentOpacity: (componentId: number, newOpacity: number) => void;
  setToggleComponentOpacity: Dispatch<
    SetStateAction<(id: number, opacity: number) => void>
  >;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState<string>();
  const [model, setModel] = useState<ModelItem>();
  const [meshes, setMeshes] = useState<MeshData[]>([]);
  const [toggleComponentVisibility, setToggleComponentVisibility] = useState<
    (id: number, visibility: boolean) => void
  >(() => (/* Default placeholder function */) => {});
  const [toggleComponentOpacity, setToggleComponentOpacity] = useState<
    (id: number, opacity: number) => void
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
