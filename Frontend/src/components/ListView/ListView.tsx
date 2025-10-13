import ModelListItem from "@/components/ListView/ModelListItem.tsx";
import { useCallback, useEffect, useState } from "react";
import { useAxiosConfig } from "@/services/AxiosConfig.tsx";
import type { ModelItem } from "@/types/ModelItem.ts";
import ModelViewer from "../ModelViewer/ModelViewer";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useTheme } from "@/components/theme-provider.tsx";
import { SidebarProvider } from "../ui/sidebar";

function ListView() {
  const [model, setModel] = useState<ModelItem | null>(null);

  const [models, setModels] = useState<ModelItem[]>([]);
  const apiClient = useAxiosConfig();
  const theme = useTheme();

  const [showAnimation, setShowAnimation] = useState(true);
  useEffect(() => {
    if (!models || models.length === 0) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 3000); // hide after 3s
      return () => clearTimeout(timer);
    } else {
      setShowAnimation(false);
    }
  }, [models]);

  const isDarkTheme =
    theme.theme === "dark" ||
    (theme.theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const animationSrc = isDarkTheme
    ? "https://lottie.host/84a02394-70c0-4d50-8cdb-8bc19f297682/iIKdhe0iAy.lottie"
    : "https://lottie.host/686ee0e1-ae73-4c41-b425-538a3791abb0/SB6QB9GRdW.lottie";

  const fetchModels = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/model");
      const data = res.data;
      setModels(data);
    } catch (e) {
      console.error(e);
    }
  }, [apiClient]);
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const [showViewer, setShowViewer] = useState(false);

  if (showViewer) {
    return (
      <SidebarProvider>
        <div className="h-[calc(100vh-4rem)] w-screen">
          <ModelViewer model={model} />
        </div>
      </SidebarProvider>
    );
  }

  return (
    <div className={`grid justify-center w-full`}>
      <div className={`m-4 md:m-8 lg:m-12 xl:m-16`}>
        <div
          className={`flex justify-between px-2 font-medium text-sm md:text-lg lg:text-xl gap-x-20`}
        >
          <h1 className={`mb-3`}>Uploaded Models</h1>
          <h1 className={`text-muted-foreground mb-3`}>
            {models?.length || 0} results found
          </h1>
        </div>

        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full justify-center items-center`}
        >
          {models && models.length > 0 ? (
            models?.map((item) => (
              <div
                onClick={() => {
                  setShowViewer(true);
                }}
              >
                <ModelListItem
                  key={item.id}
                  item={item}
                  refreshList={fetchModels}
                  onClick={() => {
                    setModel(item);
                  }}
                />
              </div>
            ))
          ) : showAnimation ? (
            <DotLottieReact
              className={`col-span-4 w-90 h-90`}
              src={animationSrc}
              loop
              autoplay
            />
          ) : (
            <div className="col-span-4 text-gray-400 text-center">
              No models found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListView;
