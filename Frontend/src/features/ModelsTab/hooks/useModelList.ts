import type { Category } from "@/shared/types/Category.ts";
import { useModel } from "@/shared/contexts/ModelContext.tsx";
import { useNavigation } from "@/shared/contexts/NavigationContext.tsx";
import { useAxiosConfig } from "@/shared/services/AxiosConfig.ts";
import { useCallback, useEffect, useState } from "react";
import type { ModelItem } from "@/shared/types/ModelItem.ts";

type ModelSearchParams = {
  categories?: Category[];
  isFavorite?: boolean;
  q?: string;
  format?: string;
  limit?: number;
};

type GetModelsResponse = {
  items: ModelItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
};

const API_LIMIT = 12;

const buildApiParams = (
  searchParams: ModelSearchParams,
  cursor: string | null,
) => {
  const params = new URLSearchParams();

  if (searchParams.categories && searchParams.categories.length > 0) {
    for (const category of searchParams.categories) {
      params.append("categories", category);
    }
  }
  if (searchParams.isFavorite) {
    params.append("isFavourite", searchParams.isFavorite.toString());
  }
  if (searchParams.q) {
    params.append("q", searchParams.q);
  }
  if (searchParams.format) {
    params.append("format", searchParams.format);
  }

  params.append("limit", API_LIMIT.toString());

  if (cursor) {
    params.append("cursor", cursor);
  }

  return params;
};

export const useModelList = () => {
  const { setUrl, setModel } = useModel();
  const { setIsModelViewer } = useNavigation();
  const apiClient = useAxiosConfig();

  const [searchParams, setSearchParams] = useState<ModelSearchParams>({});
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<Category[]>([]);
  const [pagesData, setPagesData] = useState<ModelItem[][]>([]);
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showNoResults, setShowNoResults] = useState(false);

  const models = pagesData[currentPage - 1] || [];

  useEffect(() => {
    if (isLoading) {
      setShowNoResults(false);
    } else if (!isLoading && models.length === 0) {
      setShowNoResults(true);
    } else {
      setShowNoResults(false);
    }
  }, [isLoading, models.length]);

  useEffect(() => {
    const newSearchParams: ModelSearchParams = {
      categories: categoryFilter.length > 0 ? categoryFilter : undefined,
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

  useEffect(() => {
    const handleFetchSuccess = async (
      responseData: GetModelsResponse,
      pageToFetch: number,
      isPreload: boolean,
      totalCount: number,
    ) => {
      const data = responseData.items || [];
      const nextCursor = responseData.nextCursor || null;
      const newHasMore = responseData.hasMore;

      setPagesData((prevData) => {
        const newData = [...prevData];
        newData[pageToFetch - 1] = data;
        return newData;
      });

      if (!isPreload || totalCount === 0) {
        const newTotalCount = responseData.totalCount;
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
          await fetchPage(pageToFetch + 1, true);
        }
      }
    };
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

      try {
        const params = buildApiParams(searchParams, cursor);
        const res = await apiClient.get(`/api/model?${params.toString()}`);
        await handleFetchSuccess(res.data, pageToFetch, isPreload, totalCount);
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
            await fetchPage(pageToFetch + 1, true);
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

  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

  const refreshCurrentPage = useCallback(() => {
    setCurrentPage(1);
    setPagesData([]);
    setPageCursors([null]);
    setTotalCount(0);
    setTotalPages(0);
    setIsLoading(true);
  }, []);

  const handleModelClick = (item: ModelItem) => {
    setModel(item);
    setUrl(item.url);
    setIsModelViewer(true);
  };

  return {
    isLoading,
    models,
    showNoResults,
    totalCount,
    searchInput,
    setSearchInput,
    searchTerm,
    setSearchTerm,
    handleSearch,
    favoritesOnly,
    setFavoritesOnly,
    fileTypeFilter,
    setFileTypeFilter,
    categoryFilter,
    setCategoryFilter,
    totalPages,
    currentPage,
    setCurrentPage,
    pageCursors,
    handleModelClick,
    refreshCurrentPage,
  };
};
