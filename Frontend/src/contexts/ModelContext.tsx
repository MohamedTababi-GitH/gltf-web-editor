import type { MeshData } from "@/types/ModelItem";
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
  meshes: MeshData[];
  setMeshes: Dispatch<SetStateAction<MeshData[]>>;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState<string>();
  const [meshes, setMeshes] = useState<MeshData[]>([]);
  return (
    <ModelContext.Provider value={{ url, setUrl, meshes, setMeshes }}>
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
