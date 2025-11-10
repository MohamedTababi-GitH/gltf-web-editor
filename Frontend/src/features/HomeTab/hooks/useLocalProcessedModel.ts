import { useEffect, useState } from "react";
import { loadModel } from "@/shared/utils/ModelLoader.ts";

export const useLocalProcessedModel = (
  gltfFile: File | null,
  dependentFiles: File[],
) => {
  const [processedModelUrl, setProcessedModelUrl] = useState<string | null>(
    null,
  );
  useEffect(() => {
    if (!gltfFile) {
      setProcessedModelUrl(null);
      return;
    }

    const objectUrlsToRevoke: string[] = [];
    let isMounted = true;

    loadModel({
      file: gltfFile,
      dependentFiles,
      objectUrlsToRevoke,
      setProcessedModelUrl: (newUrl) => {
        if (isMounted) {
          setProcessedModelUrl(newUrl);
        }
      },
      isMounted,
    });

    return () => {
      isMounted = false;
      for (const url of objectUrlsToRevoke) {
        URL.revokeObjectURL(url);
      }
    };
  }, [gltfFile, dependentFiles]);

  return processedModelUrl;
};
