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
import { Button } from "@/components/ui/button.tsx";
import { ButtonGroup } from "../ui/button-group";

type ModelSearchParams = {
  category?: string;
  isFavorite?: boolean;
  q?: string;
  format?: string;
  limit?: number;
};

const API_LIMIT = 2;

function ListView() {
  const { setUrl, setModel, model } = useModel();
  const [sortBy, setSortBy] = useState<"Date" | "Name" | "Size">("Date");
  const [searchParams, setSearchParams] = useState<ModelSearchParams>({});

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [pagesData, setPagesData] = useState<ModelItem[][]>([]);
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const models = pagesData[currentPage - 1] || [];

  const [showViewer, setShowViewer] = useState(false);
  const apiClient = useAxiosConfig();
  const theme = useTheme();
  const id = useId();

  const toTs = (d: string | Date) => new Date(d).getTime();
  const latestCreatedOn =
    models.length > 0 ? Math.max(...models.map((i) => toTs(i.createdOn))) : 0;

  const [showNoResults, setShowNoResults] = useState(false);
  useEffect(() => {
    if (isLoading) {
      setShowNoResults(false);
    } else if (!isLoading && models.length === 0) {
      setShowNoResults(true);
    } else {
      setShowNoResults(false);
    }
  }, [isLoading, models.length]);

  const isDarkTheme =
    theme.theme === "dark" ||
    (theme.theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const animationSrc = isDarkTheme
    ? "https://lottie.host/84a02394-70c0-4d50-8cdb-8bc19f297682/iIKdhe0iAy.lottie"
    : "https://lottie.host/686ee0e1-ae73-4c41-b425-538a3791abb0/SB6QB9GRdW.lottie";

  useEffect(() => {
    const newSearchParams: ModelSearchParams = {
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      isFavorite: favoritesOnly ? favoritesOnly : undefined,
      format: fileTypeFilter !== "all" ? fileTypeFilter : undefined,
      q: searchTerm.trim() ? searchTerm.trim() : undefined,
    };

    if (JSON.stringify(newSearchParams) !== JSON.stringify(searchParams)) {
      setSearchParams(newSearchParams);
      setCurrentPage(1);
      setPagesData([]);
      setPageCursors([null]);
      setTotalCount(0);
      setTotalPages(0);
      setIsLoading(true);
    }
  }, [fileTypeFilter, categoryFilter, favoritesOnly, searchTerm, searchParams]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

  useEffect(() => {
    /**
     * Fetches a specific page.
     * @param pageToFetch - The 1-based page number to fetch.
     * @param isPreload - True if this is a background preload, false if it's for the current view.
     */
    const fetchPage = async (pageToFetch: number, isPreload = false) => {
      if (pagesData[pageToFetch - 1]) {
        return;
      }

      const cursor = pageCursors[pageToFetch - 1];
      if (pageToFetch > 1 && cursor === undefined) {
        return;
      }

      if (!isPreload) {
        setIsLoading(true);
      }

      const params = new URLSearchParams();
      if (searchParams.category)
        params.append("category", searchParams.category);
      if (searchParams.isFavorite)
        params.append("isFavourite", searchParams.isFavorite.toString());
      if (searchParams.q) params.append("q", searchParams.q);
      if (searchParams.format) params.append("format", searchParams.format);
      params.append("limit", API_LIMIT.toString());
      if (cursor) params.append("cursor", cursor);

      try {
        const res = await apiClient.get(`/api/model?${params.toString()}`);
        const data = (res.data.items as ModelItem[]) || [];
        const nextCursor = res.data.nextCursor || null;
        const newHasMore = res.data.hasMore;

        setPagesData((prevData) => {
          const newData = [...prevData];
          newData[pageToFetch - 1] = data;
          return newData;
        });

        if (!isPreload || totalCount === 0) {
          const newTotalCount = res.data.totalCount;
          const newTotalPages = Math.ceil(newTotalCount / API_LIMIT);
          setTotalCount(newTotalCount);
          setTotalPages(newTotalPages);
        }

        if (newHasMore && nextCursor) {
          setPageCursors((prevCursors) => {
            const newCursors = [...prevCursors];
            newCursors[pageToFetch] = nextCursor;
            return newCursors;
          });

          if (!isPreload) {
            fetchPage(pageToFetch + 1, true);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!isPreload) {
          setIsLoading(false);
        }
      }
    };

    if (pagesData[currentPage - 1]) {
      setIsLoading(false);

      const nextCursor = pageCursors[currentPage];
      const hasNextPageData = pagesData[currentPage];

      if (nextCursor && !hasNextPageData) {
        fetchPage(currentPage + 1, true);
      }
    } else {
      fetchPage(currentPage, false);
    }
  }, [
    currentPage,
    searchParams,
    apiClient,
    pagesData,
    pageCursors,
    totalCount,
  ]);

  const refreshCurrentPage = useCallback(() => {
    setPagesData((prevData) => {
      const newData = [...prevData];
      newData[currentPage - 1] = [];
      return newData;
    });
  }, [currentPage]);

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

  return (
    <div className="h-full flex flex-col p-4 md:p-8 lg:p-12 xl:p-16 gap-4">
      <div className="flex flex-col md:flex-row md:justify-between px-2 font-medium text-sm md:text-lg lg:text-xl gap-y-4 md:gap-x-20">
        <div className="w-full md:max-w-xs flex items-center">
          <div className="mb-2">
            <ButtonGroup>
              <Input
                id={id}
                type="text"
                placeholder="Search a model"
                value={searchInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                onChange={(e) => setSearchInput(e.target.value)}
                className="bg-muted shadow-none pr-10"
              />
              <Button onClick={handleSearch} variant={"outline"}>
                <Search />
              </Button>
            </ButtonGroup>
          </div>
        </div>

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
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Categories</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {Object.values(ECADCategory).map((category) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={category}
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

          <span className="mt-2 sm:mt-0">
            {totalCount} result{totalCount === 1 ? "" : "s"} found
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 w-full rounded-md border">
        {isLoading ? (
          <div className="flex justify-center items-center h-full w-full">
            <DotLottieReact
              className="w-90 h-90"
              src={animationSrc}
              loop
              autoplay
            />
          </div>
        ) : models.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,24rem))] justify-center gap-4 w-full items-center p-4">
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
                  refreshList={refreshCurrentPage}
                  isLatest={toTs(item.createdOn) === latestCreatedOn}
                  onClick={() => {
                    setModel(item);
                    setShowViewer(true);
                  }}
                />
              </div>
            ))}
          </div>
        ) : showNoResults ? (
          <div className="flex justify-center items-center h-full w-full text-gray-400">
            No models found
          </div>
        ) : null}
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      {totalPages > 1 && (
        <div className="flex justify-center items-center w-full h-12">
          <ButtonGroup>
            <ButtonGroup>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
            </ButtonGroup>
            <ButtonGroup>
              {Array.from(Array(totalPages).keys()).map((page, index) => (
                <Button
                  key={index}
                  variant={page + 1 === currentPage ? "default" : "outline"}
                  onClick={() => setCurrentPage(page + 1)}
                  disabled={pageCursors[page] === undefined}
                >
                  {page + 1}
                </Button>
              ))}
            </ButtonGroup>

            <ButtonGroup>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={
                  currentPage === totalPages ||
                  pageCursors[currentPage] === undefined
                }
              >
                Next
              </Button>
            </ButtonGroup>
          </ButtonGroup>
        </div>
      )}
    </div>
  );
}

export default ListView;
