import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/card.tsx";
import { formatDateTime } from "@/shared/utils/DateTime.ts";
import { useTheme } from "@/shared/contexts/ThemeContext.tsx";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Button } from "@/shared/components/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/dropdown-menu.tsx";
import {
  EllipsisVertical,
  FileCode2,
  Database,
  Download,
  Trash2,
  FilePenLine,
  ExternalLink,
  Tags,
  Star,
  Calendar,
} from "lucide-react";
import type { ModelItem } from "@/shared/types/ModelItem.ts";

import { formatBytes } from "@/shared/utils/BytesConverter.ts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/popover.tsx";
import { DeleteModelDialog } from "@/features/ModelsTab/components/DeleteModelDialog.tsx";
import { EditModelDialog } from "@/features/ModelsTab/components/EditModelDialog.tsx";
import { useModelItem } from "@/features/ModelsTab/hooks/useModelItem.ts";

function ModelListItem({
  item,
  onClick,
  refreshList,
}: {
  item: ModelItem;
  onClick: () => void;
  refreshList: () => void;
}) {
  const { animationSrc } = useTheme();
  const {
    isNew,
    isFavorite,
    isActionMenuOpen,
    isEditOpen,
    isSaving,
    isDeleteDialogOpen,
    isDeleting,
    handleOpenModel,
    handleFavoriteToggle,
    handleDelete,
    handleSaveInfo,
    setIsActionMenuOpen,
    setIsEditOpen,
    setIsDeleteDialogOpen,
  } = useModelItem({ item, refreshList, onClick });
  if (!item) return null;

  return (
    <>
      <div className={`relative p-0 select-none`}>
        {isNew && (
          <span
            className="
                absolute top-0 left-0
                inline-flex items-center justify-center
                bg-gradient-to-r from-indigo-500 to-indigo-700
                text-white text-xs font-semibold
                rounded-br-xl rounded-tl-xl
                px-2 py-1
                select-none
                shadow-md
              "
          >
            New
          </span>
        )}

        <Card
          className="flex flex-col max-w-md hover:bg-muted/65 transition-colors cursor-pointer overflow-hidden pb-0 gap-2"
          onClick={(e) => {
            e.stopPropagation();

            if (isEditOpen || isDeleteDialogOpen || isActionMenuOpen) return;
            handleOpenModel(e);
          }}
        >
          <CardHeader className="pb-0 mt-2">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0 w-0">
                <CardTitle className="text-lg truncate">{item.name}</CardTitle>
                <CardDescription className={`min-h-8 max-h-8 pt-1`}>
                  {item.categories && item.categories.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        key={item.categories[0]}
                        className="inline-flex items-center rounded-md gap-1 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                      >
                        <Tags className={`size-3.5`} />
                        {item.categories[0]}
                      </span>

                      {item.categories.length > 1 && (
                        <Popover>
                          <PopoverTrigger
                            asChild
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <span className="inline-flex items-center rounded-md bg-muted-foreground/10 px-2 py-0.5 text-xs font-semibold text-muted-foreground cursor-pointer hover:bg-muted-foreground/20">
                              +{item.categories.length - 1}
                            </span>
                          </PopoverTrigger>
                          <PopoverContent
                            className="max-w-xs p-2"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <p className="font-semibold mb-1 text-sm">
                              More Categories:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {item.categories.slice(1).map((category) => (
                                <span
                                  key={category}
                                  className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground"
                                >
                                  {category}
                                </span>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  )}
                </CardDescription>
              </div>

              <Button
                variant="outline"
                size="icon"
                className={`flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
                  isFavorite
                    ? "bg-white border-yellow-400 hover:bg-yellow-50"
                    : "bg-transparent border-gray-600 hover:bg-neutral-200 hover:dark:bg-neutral-900"
                }`}
                onClick={handleFavoriteToggle}
              >
                <Star
                  className={`w-5 h-5 transition ${
                    isFavorite
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-400"
                  }`}
                />
              </Button>

              <DropdownMenu onOpenChange={setIsActionMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0 h-8 w-7"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EllipsisVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem
                    onClick={() => setIsEditOpen(true)}
                    className={`cursor-pointer`}
                  >
                    <FilePenLine className="mr-2 h-4 w-4" />
                    <span>Edit Info</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className={`cursor-pointer`}>
                    <a href={item.url} download>
                      <Download className="mr-2 h-4 w-4" />
                      <span>Download</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleOpenModel}
                    className={`cursor-pointer`}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    <span>Open</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent className="px-6 pt-0flex-grow flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground min-h-8">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDateTime(item.createdOn).dateStr}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileCode2 className="h-4 w-4" />
                <span>.{item.format}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Database className="h-4 w-4" />
                <span>{formatBytes(item.sizeBytes)}</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-0">
            {(() => {
              const thumbnailFile = item.additionalFiles?.find(
                (file) =>
                  file.contentType === "image/png" &&
                  file.name === "thumbnail.png",
              );

              return (
                <div
                  className="
          w-full
          border-t
          dark:bg-black
          aspect-video
          overflow-hidden
          relative
          flex
          items-center
          justify-center
        "
                >
                  {thumbnailFile ? (
                    <img
                      src={thumbnailFile.url}
                      alt="thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <DotLottieReact
                      src={animationSrc}
                      loop
                      autoplay={false}
                      className="w-32 h-32"
                    />
                  )}
                </div>
              );
            })()}
          </CardFooter>
        </Card>
      </div>

      <DeleteModelDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
      <EditModelDialog
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSave={handleSaveInfo}
        isSaving={isSaving}
        item={item}
      />
    </>
  );
}

export default ModelListItem;
