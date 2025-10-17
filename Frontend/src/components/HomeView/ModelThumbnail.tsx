import { Canvas, useLoader } from "@react-three/fiber";
import { Suspense, useRef, useState, memo, useEffect } from "react";
import { Environment, Center, OrbitControls } from "@react-three/drei";
import { Button } from "@/components/ui/button.tsx";
import { Camera, Check } from "lucide-react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type ModelThumbnailProps = {
  gltfFile: File;
  dependentFiles: File[];
  onSnapshot?: (image: string) => void;
};

const LoadedModel = memo(({ url }: { url: string }) => {
  const gltf = useLoader(GLTFLoader, url);
  return (
    <group scale={0.001} position={[0, -10, 0]}>
      <primitive object={gltf.scene} />
    </group>
  );
});

const Model = memo(
  ({
    gltfFile,
    dependentFiles,
  }: {
    gltfFile: File;
    dependentFiles: File[];
  }) => {
    const [processedModelUrl, setProcessedModelUrl] = useState<string | null>(
      null,
    );

    useEffect(() => {
      const objectUrlsToRevoke: string[] = [];
      let isMounted = true;

      const loadModel = async () => {
        if (gltfFile.name.toLowerCase().endsWith(".glb")) {
          const url = URL.createObjectURL(gltfFile);
          objectUrlsToRevoke.push(url);
          if (isMounted) {
            setProcessedModelUrl(url);
          }
          return;
        }

        const fileMap = new Map<string, string>();
        dependentFiles.forEach((file) => {
          const url = URL.createObjectURL(file);
          fileMap.set(file.name, url);
          objectUrlsToRevoke.push(url);
        });

        const gltfText = await gltfFile.text();
        const gltfJson = JSON.parse(gltfText);

        const replaceUri = (uri: string) => fileMap.get(uri) || uri;
        if (gltfJson.buffers) {
          for (const buffer of gltfJson.buffers) {
            if (buffer.uri && fileMap.has(buffer.uri)) {
              buffer.uri = replaceUri(buffer.uri);
            }
          }
        }
        if (gltfJson.images) {
          for (const image of gltfJson.images) {
            if (image.uri && fileMap.has(image.uri)) {
              image.uri = replaceUri(image.uri);
            }
          }
        }

        const patchedGltfString = JSON.stringify(gltfJson);
        const patchedGltfBlob = new Blob([patchedGltfString], {
          type: "application/json",
        });
        const newGltfUrl = URL.createObjectURL(patchedGltfBlob);
        objectUrlsToRevoke.push(newGltfUrl);

        if (isMounted) {
          setProcessedModelUrl(newGltfUrl);
        }
      };

      loadModel();

      return () => {
        isMounted = false;
        for (const url of objectUrlsToRevoke) {
          URL.revokeObjectURL(url);
        }
      };
    }, [gltfFile, dependentFiles]);

    return processedModelUrl ? <LoadedModel url={processedModelUrl} /> : null;
  },
);

function ModelThumbnail({
  gltfFile,
  dependentFiles,
  onSnapshot,
}: ModelThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [thumbnailCaptured, setThumbnailCaptured] = useState(false);

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
        camera={{ position: [-15, 15, 30], fov: 50, far: 100000 }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => (canvasRef.current = state.gl.domElement)}
      >
        <Suspense fallback={null}>
          <Environment preset={"city"} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Center>
            <Model gltfFile={gltfFile} dependentFiles={dependentFiles} />
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
