import { Canvas, useLoader } from "@react-three/fiber";
import { Suspense, useRef, useState, memo } from "react";
import { Environment, Center, OrbitControls, Resize } from "@react-three/drei";
import { Button } from "@/components/button.tsx";
import { Camera, Check } from "lucide-react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useLocalProcessedModel } from "@/features/HomeView/hooks/useLocalProcessedModel.ts";

type ModelThumbnailProps = {
  gltfFile: File;
  dependentFiles: File[];
  onSnapshot?: (image: string) => void;
};

const LoadedModel = memo(({ url }: { url: string }) => {
  const gltf = useLoader(GLTFLoader, url);
  return (
    <group>
      <primitive object={gltf.scene} />
    </group>
  );
});

function ModelThumbnail({
  gltfFile,
  dependentFiles,
  onSnapshot,
}: ModelThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [thumbnailCaptured, setThumbnailCaptured] = useState(false);
  const processedModelUrl = useLocalProcessedModel(gltfFile, dependentFiles);
  const takeSnapshot = () => {
    if (!canvasRef.current) return;
    const image = canvasRef.current.toDataURL("image/png");
    onSnapshot?.(image);
    setThumbnailCaptured(true);
    setTimeout(() => setThumbnailCaptured(false), 1500);
  };

  return (
    <div
      style={{ width: 400, height: 200 }}
      className={`border-2 w-full rounded-md`}
    >
      <Canvas
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => (canvasRef.current = state.gl.domElement)}
      >
        <Suspense fallback={null}>
          <Environment preset={"city"} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Center>
            <Resize scale={10}>
              {processedModelUrl && <LoadedModel url={processedModelUrl} />}
            </Resize>
          </Center>
          <OrbitControls makeDefault />
        </Suspense>
      </Canvas>
      <Button
        className={`w-full mt-2 ${thumbnailCaptured ? "bg-chart-2 hover:bg-chart-2" : ""}`}
        onClick={takeSnapshot}
      >
        {thumbnailCaptured ? <Check /> : <Camera />}
        {thumbnailCaptured ? "Captured" : "Capture Thumbnail"}
      </Button>
    </div>
  );
}

export default memo(ModelThumbnail);
