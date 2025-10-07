// src/components/ModelViewer/ModelViewer.tsx
import React from "react";

// Define the type of your model
type Model = {
  name: string;
};

type ModelViewerProps = {
  model?: Model; // optional, since you might render without a model
};

const ModelViewer: React.FC<ModelViewerProps> = ({ model }) => {
  return (
    <div className="flex-1 h-screen bg-gray-800 flex items-center justify-center text-white">
      <div>
        <p>3D Viewer Area</p>
        {model && <p>{model.name}</p>}
      </div>
    </div>
  );
};

export default ModelViewer;
