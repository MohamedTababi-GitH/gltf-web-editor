import React from "react";
import type { ModelItem } from "@/types/ModelItem";

type ModelViewerProps = {
  model: ModelItem | null;
  setShowViewer: (show: boolean) => void;
};

const ModelViewer: React.FC<ModelViewerProps> = ({ model, setShowViewer }) => {
  console.log(model);
  console.log(setShowViewer);
  return <div className="flex w-full h-full overflow-hidden"></div>;
};

export default ModelViewer;
