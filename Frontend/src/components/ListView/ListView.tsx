import ModelListItem from "@/components/ListView/ModelListItem.tsx";
import { useCallback, useEffect, useState } from "react";
import { useAxiosConfig } from "@/services/AxiosConfig.tsx";
import type { ModelItem } from "@/types/ModelItem.ts";
import ModelViewer from "../ModelViewer/ModelViewer";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useTheme } from "@/components/theme-provider.tsx";
import { SidebarProvider } from "../ui/sidebar";
import { ListFilter, Search, X } from "lucide-react";
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
import { ECADCategory } from "@/types/Category.ts";

type ModelSearchParams = {
  category?: string;
  isFavorite?: boolean;
  q?: string;
  format?: string;
  limit?: number;
  cursor?: string;
};

function ListView() {
  const [models, setModels] = useState<ModelItem[]>([]);
  const { setUrl, setModel, model } = useModel();
  const [sortBy, setSortBy] = useState<"Date" | "Name" | "Size">("Date");
  const [searchParams, setSearchParams] = useState<ModelSearchParams>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const id = useId();
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showViewer, setShowViewer] = useState(false);
  const apiClient = useAxiosConfig();
  const theme = useTheme();

  {
    /* Added this const part that finds the most recently created model by simply comparing all "createdOn" timestamps! */
  }
  const toTs = (d: string | Date) => new Date(d).getTime();
  const latestCreatedOn = Math.max(...models.map((i) => toTs(i.createdOn)));

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

  const fetchModels = useCallback(
    async ({
      category,
      isFavorite,
      q,
      format,
      limit,
      cursor,
    }: ModelSearchParams) => {
      const params = new URLSearchParams();
      if (category) params.append("category", category);
      if (isFavorite) params.append("isFavourite", isFavorite.toString());
      if (q) params.append("q", q);
      if (format) params.append("format", format);
      if (limit) params.append("limit", limit.toString());
      if (cursor) params.append("cursor", cursor);
      try {
        const res = await apiClient.get(`/api/model?${params.toString()}`);
        const data = (res.data.items as ModelItem[]) || [];
        setModels(data);
      } catch (e) {
        console.error(e);
      }
    },
    [apiClient],
  );
  useEffect(() => {
    fetchModels({});
  }, [fetchModels]);

  useEffect(() => {
    setSearchParams((prev) => {
      const newSearchParams = {
        ...prev,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        isFavorite: favoritesOnly ? favoritesOnly : undefined,
        format: fileTypeFilter !== "all" ? fileTypeFilter : undefined,
      };

      fetchModels(newSearchParams);
      return newSearchParams;
    });
  }, [fileTypeFilter, categoryFilter, favoritesOnly, fetchModels]);

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

  const searchModels = async () => {
    const newSearchParams = {
      ...searchParams,
      q: searchTerm.trim() ? searchTerm : undefined,
    };
    setSearchParams(newSearchParams);
    await fetchModels(newSearchParams);
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 lg:p-12 xl:p-16 gap-4">
      <div className="flex flex-col md:flex-row md:justify-between px-2 font-medium text-sm md:text-lg lg:text-xl gap-y-4 md:gap-x-20">
        <div className="w-full md:max-w-xs flex items-center">
          <div className="relative mb-2">
            <Input
              id={id}
              type="text"
              placeholder="Search a model"
              value={searchTerm}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  searchModels();
                }
              }}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-muted border-transparent shadow-none pr-10"
            />
            <Search
              onClick={searchModels}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer hover:bg-muted p-1 rounded-sm w-6 h-6"
            />
          </div>
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
                      checked={sortBy === "Name"}
                      onCheckedChange={() => setSortBy("Name")}
                    >
                      Name
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={sortBy === "Size"}
                      onCheckedChange={() => setSortBy("Size")}
                    >
                      Size
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={sortBy === "Date"}
                      onCheckedChange={() => setSortBy("Date")}
                    >
                      Date
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
                      Favourites only
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={!favoritesOnly}
                      onCheckedChange={() => setFavoritesOnly(false)}
                    >
                      All
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
                      .glb
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={fileTypeFilter === "gltf"}
                      onCheckedChange={() => setFileTypeFilter("gltf")}
                    >
                      .gltf
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={fileTypeFilter === "all"}
                      onCheckedChange={() => setFileTypeFilter("all")}
                    >
                      All
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Submenu 4: Categories */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Categories</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {Object.values(ECADCategory).map((category) => {
                      return (
                        <DropdownMenuCheckboxItem
                          checked={categoryFilter === category}
                          onCheckedChange={() => setCategoryFilter(category)}
                        >
                          {category}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                    <DropdownMenuCheckboxItem
                      checked={categoryFilter === "all"}
                      onCheckedChange={() => setCategoryFilter("all")}
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
                <span className="bg-muted px-3 py-1.5 rounded-md border inline-flex items-center gap-2">
                  Sort By: {sortBy}
                  {sortBy !== "Date" && (
                    <X
                      className="w-4 h-4 cursor-pointer rounded-full hover:bg-foreground/10 hover:border transition duration-150"
                      onClick={() => setSortBy("Date")}
                    />
                  )}
                </span>
              )}
              {favoritesOnly && (
                <span className="bg-muted px-3 py-1.5 rounded-md border inline-flex items-center gap-2">
                  Favorites Only
                  <X
                    className="w-4 h-4 cursor-pointer rounded-full hover:bg-foreground/10 hover:border transition duration-150"
                    onClick={() => setFavoritesOnly(false)}
                  />
                </span>
              )}
              {fileTypeFilter !== "all" && (
                <span className="bg-muted px-3 py-1.5 rounded-md border inline-flex items-center gap-2">
                  Type: {fileTypeFilter.toUpperCase()}
                  <X
                    className="w-4 h-4 cursor-pointer rounded-full hover:bg-foreground/10 hover:border transition duration-150"
                    onClick={() => setFileTypeFilter("all")}
                  />
                </span>
              )}
              {categoryFilter !== "all" && (
                <span className="bg-muted px-3 py-1.5 rounded-md border inline-flex items-center gap-2">
                  Category: {categoryFilter}
                  <X
                    className="w-4 h-4 cursor-pointer rounded-full hover:bg-foreground/10 hover:border transition duration-150"
                    onClick={() => setCategoryFilter("all")}
                  />
                </span>
              )}
            </div>
          </div>

          {/* Counter for the number of models we have. */}
          <span className="mt-2 sm:mt-0">
            {models?.length || 0} result{models?.length === 1 ? "" : "s"} found
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 w-full rounded-md border">
        {models && models.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fit,22rem)] justify-center gap-4 w-full items-center p-4">
            {models.map((item) => (
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
                  refreshList={() => fetchModels(searchParams)}
                  isLatest={toTs(item.createdOn) === latestCreatedOn}
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
  );
}

export default ListView;
