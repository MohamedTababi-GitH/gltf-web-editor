import { useEffect, useState } from "react";
import { loadModel } from "@/shared/utils/ModelLoader.ts";
import { useModel } from "@/shared/contexts/ModelContext.tsx";

export const useProcessedModel = () => {
  const [processedModelURL, setProcessedModelURL] = useState<string | null>(
    null,
  );
  const { url, model } = useModel();
  const additionalFilesJson = JSON.stringify(model?.additionalFiles);
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
          .substring(url.lastIndexOf("/") + 1)
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
      for (const url of objectUrlsToRevoke) {
        URL.revokeObjectURL(url);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, additionalFilesJson]);

  return processedModelURL;
};
