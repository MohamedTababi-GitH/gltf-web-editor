import { useModelList } from "@/features/ListView/hooks/useModelList.ts";
import { Paginator } from "@/features/ListView/components/Paginator.tsx";
import { SearchFilterControls } from "@/features/ListView/components/SearchFilterControls.tsx";
import { ModelListGrid } from "@/features/ListView/components/ModelListGrid.tsx";

function ListView() {
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
    <div className="h-full flex flex-col p-4 md:p-8 lg:p-12 xl:p-16 gap-4">
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

export default ListView;
