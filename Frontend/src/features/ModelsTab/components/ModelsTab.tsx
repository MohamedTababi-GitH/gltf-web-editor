import { useModelList } from "@/features/ModelsTab/hooks/useModelList.ts";
import { Paginator } from "@/features/ModelsTab/components/Paginator.tsx";
import { SearchFilterControls } from "@/features/ModelsTab/components/SearchFilterControls.tsx";
import { ModelListGrid } from "@/features/ModelsTab/components/ModelListGrid.tsx";

function ModelsTab() {
  const {
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
  } = useModelList();

  return (
    <div className="h-[calc(100dvh-4rem)] flex flex-col p-4 md:p-6 lg:p-8 gap-4">
      <SearchFilterControls
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSearch={handleSearch}
        favoritesOnly={favoritesOnly}
        setFavoritesOnly={setFavoritesOnly}
        fileTypeFilter={fileTypeFilter}
        setFileTypeFilter={setFileTypeFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        totalCount={totalCount}
      />

      <ModelListGrid
        isLoading={isLoading}
        models={models}
        refreshCurrentPage={refreshCurrentPage}
        showNoResults={showNoResults}
        handleModelClick={handleModelClick}
      />

      <Paginator
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        currentPage={currentPage}
        pageCursors={pageCursors}
      />
    </div>
  );
}

export default ModelsTab;
