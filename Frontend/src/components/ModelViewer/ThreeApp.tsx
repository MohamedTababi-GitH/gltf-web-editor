import { Center, OrbitControls, Environment, Resize } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Model } from "./Model";
import { Suspense, useEffect, useState } from "react";
import { loadModel } from "@/utils/ModelLoader.ts";
import { useModel } from "@/contexts/ModelContext.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import Cursors from "@/components/ModelViewer/Cursors.tsx";
import type { Cursor } from "@/types/Cursor.ts";
import * as THREE from "three";

function Loading({ progress }: { progress: number }) {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <Spinner className="text-primary w-20 h-20" />
      <p className="mt-4 font-medium">Loading Model ({progress}%)</p>
    </div>
  );
}

export default function ThreeApp() {
  const { url, model } = useModel();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedTool, setSelectedTool] = useState<Cursor>("Select");
  const [processedModelURL, setProcessedModelURL] = useState<string | null>(
    null,
  );
  useEffect(() => {
    let isMounted = true;
    const objectUrlsToRevoke: string[] = [];

    const processAndLoad = async () => {
      if (!url || !model) {
        if (isMounted) setProcessedModelURL(null);
        return;
      }

      try {
        const mainFileName = url
          .substring(url.lastIndexOf("%2F") + 1)
          .split("?")[0];
        const mainFileResponse = await fetch(url);
        const mainFileBlob = await mainFileResponse.blob();
        const mainFile = new File([mainFileBlob], mainFileName);

        const dependentFilesPromises = (model.additionalFiles || []).map(
          async (file) => {
            const response = await fetch(file.url);
            const blob = await response.blob();
            return new File([blob], file.name);
          },
        );

        const dependentFiles = await Promise.all(dependentFilesPromises);

        await loadModel({
          file: mainFile,
          dependentFiles,
          objectUrlsToRevoke,
          setProcessedModelUrl: (newUrl) => {
            if (isMounted) {
              setProcessedModelURL(newUrl);
            }
          },
          isMounted,
        });
      } catch (error) {
        console.error("Error processing model files:", error);
        if (isMounted) {
          setProcessedModelURL(null);
        }
      }
    };

    processAndLoad();

    return () => {
      isMounted = false;
      objectUrlsToRevoke.forEach(URL.revokeObjectURL);
    };
  }, [url, model]);

  return (
    <div className={`w-full h-full relative`}>
      {loadingProgress > 0 && (
        <div className="absolute inset-0 z-10 bg-background/80 flex justify-center items-center">
          <Loading progress={loadingProgress} />
        </div>
      )}
      <Cursors setSelectedTool={setSelectedTool} selectedTool={selectedTool} />
      <Canvas>
        <color attach="background" args={["#888888"]} />
        <Suspense fallback={null}>
          <Environment preset="city" background={false} />
          <Center>
            <Resize scale={3}>
              {processedModelURL && (
                <Model
                  selectedTool={selectedTool}
                  processedUrl={processedModelURL}
                  setLoadingProgress={setLoadingProgress}
                />
              )}
            </Resize>
          </Center>
        </Suspense>
        <OrbitControls
          makeDefault
          enableDamping={false}
          mouseButtons={{
            LEFT:
              selectedTool === "Move" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
          }}
          touches={{
            ONE: selectedTool === "Move" ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
        />
      </Canvas>
    </div>
  );
}
