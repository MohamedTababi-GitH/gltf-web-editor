import ModelListItem from "@/components/ListView/ModelListItem.tsx";
import { useCallback, useEffect, useState } from "react";
import { useAxiosConfig } from "@/services/AxiosConfig.tsx";
import type { ModelItem } from "@/types/ModelItem.ts";
import ModelViewer from "../ModelViewer/ModelViewer";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useTheme } from "@/components/theme-provider.tsx";
import { SidebarProvider } from "../ui/sidebar";
import { ListFilter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

function ListView() {
  const [model, setModel] = useState<ModelItem | null>(null);

  const [models, setModels] = useState<ModelItem[]>([]);
  const [sortBy, setSortBy] = useState<"date" | "name" | "size" | "fileType">(
    "date"
  );
  const [showViewer, setShowViewer] = useState(false);
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

  if (showViewer) {
    return (
      <SidebarProvider>
        <div className="h-[calc(100vh-4rem)] w-screen">
          <ModelViewer model={model} />
        </div>
      </SidebarProvider>
    );
  }

  const sortedModels = [...models].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "size":
        return (a.sizeBytes || 0) - (b.sizeBytes || 0);
      case "fileType":
        return (a.format || "").localeCompare(b.format || "");
      case "date":
      default:
        return (
          new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime()
        ); // newest first
    }
  });

  return (
    <div className={`grid justify-center w-full`}>
      <div className={`m-4 md:m-8 lg:m-12 xl:m-16`}>
        <div
          className={`flex justify-between px-2 font-medium text-sm md:text-lg lg:text-xl gap-x-20`}
        >
          <h1 className={`mb-3`}>Uploaded Models</h1>
          <div className="flex items-center gap-8 text-muted-foreground mb-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:text-foreground transition">
                  <ListFilter className="w-5 h-5" />
                  <span>
                    Sort by: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy("name")}>
                  Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("size")}>
                  Size
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("date")}>
                  Date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("fileType")}>
                  File Type
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <span>{models?.length || 0} results found</span>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full justify-center items-center`}
        >
          {sortedModels && sortedModels.length > 0 ? (
            sortedModels.map((item) => (
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
