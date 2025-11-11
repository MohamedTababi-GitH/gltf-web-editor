import { ScrollArea, ScrollBar } from "@/shared/components/scroll-area.tsx";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import ModelListItem from "@/features/ModelsTab/components/ModelListItem.tsx";
import type { ModelItem } from "@/shared/types/ModelItem.ts";
import { useTheme } from "@/shared/contexts/ThemeContext.tsx";

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
}: Readonly<ModelListGridProps>) {
  const { animationSrc } = useTheme();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-[calc(100dvh-16rem)] w-full">
          <DotLottieReact
            className="w-90 h-90"
            src={animationSrc}
            loop
            autoplay
          />
        </div>
      );
    }

    if (models.length > 0) {
      return (
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
      );
    }

    if (showNoResults) {
      return (
        <div className="flex justify-center items-center h-full w-full text-gray-400">
          No models found
        </div>
      );
    }

    return null;
  };

  return (
    <ScrollArea className="flex-1 min-h-0 w-full rounded-md border">
      {renderContent()}
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
