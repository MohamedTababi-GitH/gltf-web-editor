import { Canvas, useLoader } from "@react-three/fiber";
import React, { Suspense, useRef, useState, memo, useEffect } from "react";
import { Environment, Center, OrbitControls, Resize } from "@react-three/drei";
import { Button } from "@/shared/components/button.tsx";
import { Camera, Check } from "lucide-react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useLocalProcessedModel } from "@/features/HomeTab/hooks/useLocalProcessedModel.ts";
import * as THREE from "three";

type ModelThumbnailProps = {
  gltfFile: File;
  dependentFiles: File[];
  onSnapshot?: (image: string) => void;
  setGroupRef: (ref: React.RefObject<THREE.Group | null>) => void;
};

const LoadedModel = memo(
  ({
    url,
    groupRef,
    setScene,
  }: {
    url: string;
    groupRef: React.RefObject<THREE.Group | null> | null;
    setScene: (scene: THREE.Group) => void;
  }) => {
    const gltf = useLoader(GLTFLoader, url);
    useEffect(() => {
      if (gltf.scene) {
        setScene(gltf.scene);
      }
    }, [gltf.scene, setScene]);
    return (
      <group ref={groupRef}>
        <primitive object={gltf.scene} />
      </group>
    );
  },
);

function ModelThumbnail({
  gltfFile,
  dependentFiles,
  onSnapshot,
  setGroupRef,
}: Readonly<ModelThumbnailProps>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [scene, setScene] = useState<THREE.Group>();
  const [thumbnailCaptured, setThumbnailCaptured] = useState(false);
  const processedModelUrl = useLocalProcessedModel(gltfFile, dependentFiles);
  const takeSnapshot = () => {
    if (!canvasRef.current) return;
    const image = canvasRef.current.toDataURL("image/png");
    onSnapshot?.(image);
    setThumbnailCaptured(true);
    setTimeout(() => setThumbnailCaptured(false), 1500);
  };

  useEffect(() => {
    if (groupRef.current && scene) {
      setGroupRef(groupRef);
    }
  }, [setGroupRef, scene]);
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
              {processedModelUrl && (
                <LoadedModel
                  url={processedModelUrl}
                  groupRef={groupRef}
                  setScene={setScene}
                />
              )}
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
