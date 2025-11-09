import { ScrollArea, ScrollBar } from "@/components/scroll-area.tsx";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import ModelListItem from "@/features/ListView/components/ModelListItem.tsx";
import type { ModelItem } from "@/types/ModelItem.ts";
import { useTheme } from "@/contexts/ThemeContext.tsx";

type ModelListGridProps = {
  isLoading: boolean;
  models: ModelItem[];
  refreshCurrentPage: () => void;
  showNoResults: boolean;
  handleModelClick: (model: ModelItem) => void;
};

export function ModelListGrid({
  isLoading,
  models,
  refreshCurrentPage,
  showNoResults,
  handleModelClick,
}: ModelListGridProps) {
  const { animationSrc } = useTheme();

  return (
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
            <div key={item.id}>
              <ModelListItem
                key={item.id}
                item={item}
                refreshList={refreshCurrentPage}
                onClick={() => handleModelClick(item)}
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
  );
}
