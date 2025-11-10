import { type Category, ECADCategory } from "@/shared/types/Category.ts";
import { ButtonGroup } from "@/shared/components/button-group.tsx";
import { Input } from "@/shared/components/input.tsx";
import { Button } from "@/shared/components/button.tsx";
import { ListFilter, Search, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/components/dropdown-menu.tsx";
import { useId } from "react";

type SearchFilterControlsProps = {
  searchInput: string;
  handleSearch: () => void;
  setSearchInput: (value: ((prevState: string) => string) | string) => void;
  searchTerm: string;
  setSearchTerm: (value: ((prevState: string) => string) | string) => void;
  favoritesOnly: boolean;
  setFavoritesOnly: (
    value: ((prevState: boolean) => boolean) | boolean,
  ) => void;
  fileTypeFilter: string;
  setFileTypeFilter: (value: ((prevState: string) => string) | string) => void;
  categoryFilter: Category[];
  setCategoryFilter: (
    value: ((prevState: Category[]) => Category[]) | Category[],
  ) => void;
  totalCount: number;
};

export function SearchFilterControls({
  searchInput,
  handleSearch,
  setSearchInput,
  searchTerm,
  setSearchTerm,
  favoritesOnly,
  setFavoritesOnly,
  fileTypeFilter,
  setFileTypeFilter,
  categoryFilter,
  setCategoryFilter,
  totalCount,
}: Readonly<SearchFilterControlsProps>) {
  const id = useId();
  const handleRemoveCategory = (categoryToRemove: Category) => {
    setCategoryFilter((prev) => prev.filter((c) => c !== categoryToRemove));
  };
  const handleAddCategory = (categoryToAdd: Category) => {
    setCategoryFilter((prev) => [...prev, categoryToAdd]);
  };
  return (
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
            {searchTerm && (
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setSearchInput("");
                }}
                variant={"outline"}
              >
                <X className={`text-muted-foreground`} />
              </Button>
            )}
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
                    const isChecked = categoryFilter.includes(category);
                    return (
                      <DropdownMenuCheckboxItem
                        key={category}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleAddCategory(category);
                          } else {
                            handleRemoveCategory(category);
                          }
                        }}
                      >
                        {category}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                  <DropdownMenuCheckboxItem
                    checked={categoryFilter.length === 0}
                    onCheckedChange={() => setCategoryFilter([])}
                  >
                    All
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground">
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
                Type: .{fileTypeFilter}
                <X
                  className="w-4 h-4 cursor-pointer rounded-full hover:bg-foreground/10 hover:border transition duration-150"
                  onClick={() => setFileTypeFilter("all")}
                />
              </span>
            )}
            {categoryFilter.map((category) => (
              <span
                key={category}
                className="bg-muted px-3 py-1.5 rounded-md border inline-flex items-center gap-2"
              >
                Category: {category}
                <X
                  className="w-4 h-4 cursor-pointer rounded-full hover:bg-foreground/10 hover:border transition duration-150"
                  onClick={() => handleRemoveCategory(category)}
                />
              </span>
            ))}
          </div>
        </div>

        <span className="mt-2 sm:mt-0">
          {totalCount} result{totalCount === 1 ? "" : "s"} found
        </span>
      </div>
    </div>
  );
}
