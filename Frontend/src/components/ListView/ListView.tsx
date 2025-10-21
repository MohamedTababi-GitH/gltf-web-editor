import ModelListItem from "@/components/ListView/ModelListItem.tsx";
import { useCallback, useEffect, useState } from "react";
import { useAxiosConfig } from "@/services/AxiosConfig.tsx";
import type { ModelItem } from "@/types/ModelItem.ts";
import ModelViewer from "../ModelViewer/ModelViewer";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useTheme } from "@/components/theme-provider.tsx";
import { SidebarProvider } from "../ui/sidebar";
import { ListFilter } from "lucide-react";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useModel } from "@/contexts/ModelContext";

function ListView() {
  const [model, setModel] = useState<ModelItem | null>(null);
  const [models, setModels] = useState<ModelItem[]>([]);
  const { setUrl } = useModel();
  const [sortBy, setSortBy] = useState<"date" | "name" | "size" | "fileType">(
    "date",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const id = useId();
  const [fileTypeFilter, setFileTypeFilter] = useState("all");

  const [showViewer, setShowViewer] = useState(false);
  const apiClient = useAxiosConfig();
  const theme = useTheme();

  const [showAnimation, setShowAnimation] = useState(true);
  useEffect(() => {
    if (!models || models.length === 0) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 3000);
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

  if (showViewer && model) {
    setUrl(model.url);
    return (
      <SidebarProvider>
        <div className="h-[calc(100vh-4rem)] w-screen">
          <ModelViewer model={model} setShowViewer={setShowViewer} />
        </div>
      </SidebarProvider>
    );
  }

  const filteredAndSortedModels = models
    .filter((model) => {
      const matchesSearch = model.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesFileType =
        fileTypeFilter === "all" ? true : model.format === fileTypeFilter;
      const matchesFavorite = favoritesOnly ? model.isFavourite : true;
      return matchesSearch && matchesFileType && matchesFavorite;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return (b.sizeBytes || 0) - (a.sizeBytes || 0);
        case "fileType":
          return (a.format || "").localeCompare(b.format || "");
        case "date":
        default:
          return (
            new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime()
          );
      }
    });

  return (
    <div className="grid justify-center w-full">
      <div className="m-4 md:m-8 lg:m-12 xl:m-16">
        <div className="flex flex-col md:flex-row md:justify-between px-2 font-medium text-sm md:text-lg lg:text-xl gap-y-4 md:gap-x-20">
          <div className="w-full md:max-w-xs space-y-2">
            <Input
              id={id}
              type="text"
              placeholder="Search a model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-muted border-transparent shadow-none mb-2"
            />
          </div>

          {/* flex-col: --> filter and applied filters will be stacked on mobile screens vertically*/}
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-muted-foreground mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:text-foreground transition">
                    <ListFilter className="w-5 h-5" />
                    <span>Filter</span>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  {/* Submenu 1: Sort-by */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Sort by</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuCheckboxItem
                        checked={sortBy === "name"}
                        onCheckedChange={() => setSortBy("name")}
                      >
                        Name
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={sortBy === "size"}
                        onCheckedChange={() => setSortBy("size")}
                      >
                        Size
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={sortBy === "date"}
                        onCheckedChange={() => setSortBy("date")}
                      >
                        Date
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={sortBy === "fileType"}
                        onCheckedChange={() => setSortBy("fileType")}
                      >
                        File Type
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Submenu 2: Favorite filter */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Favorite</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuCheckboxItem
                        checked={favoritesOnly}
                        onCheckedChange={() => setFavoritesOnly(true)}
                      >
                        Show favourites only
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={!favoritesOnly}
                        onCheckedChange={() => setFavoritesOnly(false)}
                      >
                        Show all
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Submenu 3: File type */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>File type</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuCheckboxItem
                        checked={fileTypeFilter === "glb"}
                        onCheckedChange={() => setFileTypeFilter("glb")}
                      >
                        glb
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={fileTypeFilter === "gltf"}
                        onCheckedChange={() => setFileTypeFilter("gltf")}
                      >
                        gltf
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={fileTypeFilter === "all"}
                        onCheckedChange={() => setFileTypeFilter("all")}
                      >
                        All
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Here we'll show the applied filters --> simply by checking the value of the consts we made! */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-foreground">
                {sortBy && (
                  <span className="bg-muted px-2 py-1 rounded-full">
                    Sort: {sortBy}
                  </span>
                )}
                {favoritesOnly && (
                  <span className="bg-muted px-2 py-1 rounded-full">
                    Favorites: On
                  </span>
                )}
                {fileTypeFilter !== "all" && (
                  <span className="bg-muted px-2 py-1 rounded-full">
                    Type: {fileTypeFilter}
                  </span>
                )}
              </div>
            </div>

            {/* Counter for the number of models we have. */}
            <span className="mt-2 sm:mt-0">
              {filteredAndSortedModels?.length || 0} results found
            </span>
          </div>
        </div>

        <ScrollArea className="h-[70vh] w-full rounded-md border">
          {filteredAndSortedModels && filteredAndSortedModels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full justify-center items-center p-4">
              {filteredAndSortedModels.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setModel(item);
                    setShowViewer(true);
                  }}
                >
                  <ModelListItem
                    key={item.id}
                    item={item}
                    refreshList={fetchModels}
                    onClick={() => {
                      setModel(item);
                      setShowViewer(true);
                    }}
                  />
                </div>
              ))}
            </div>
          ) : showAnimation ? (
            <div className="flex justify-center items-center h-full w-full">
              <DotLottieReact
                className="w-90 h-90"
                src={animationSrc}
                loop
                autoplay
              />
            </div>
          ) : (
            <div className="flex justify-center items-center h-full w-full text-gray-400">
              No models found
            </div>
          )}
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    </div>
  );
}

export default ListView;
