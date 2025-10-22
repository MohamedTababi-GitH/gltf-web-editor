import { Center, OrbitControls, Environment, Resize } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Model } from "./Model";
import { Suspense, useEffect, useState } from "react";
import { loadModel } from "@/utils/ModelLoader.ts";
import { useModel } from "@/contexts/ModelContext.tsx";

export default function ThreeApp() {
  const { url, model } = useModel();
  const [processedModelURL, setProcessedModelURL] = useState<string | null>(
    null,
  );
  useEffect(() => {
    let isMounted = true;
    const objectUrlsToRevoke: string[] = [];

    const processAndLoad = async () => {
      console.log("Processing model:", url, model);
      if (!url || !model) {
        if (isMounted) setProcessedModelURL(null);
        return;
      }

      try {
        const mainFileName = url
          .substring(url.lastIndexOf("%2F") + 1)
          .split("?")[0];
        console.log("Processing model files:", mainFileName);
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
    <Canvas>
      <color attach="background" args={["#888888"]} />
      <Suspense fallback={null}>
        <Environment preset="city" background={false} />
        <Center>
          <Resize scale={3}>
            {processedModelURL && <Model processedUrl={processedModelURL} />}
          </Resize>
        </Center>
      </Suspense>
      <OrbitControls makeDefault enableDamping={false} />
    </Canvas>
  );
}
