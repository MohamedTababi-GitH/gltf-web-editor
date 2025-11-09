import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/card.tsx";
import { formatDateTime } from "@/utils/DateTime.ts";
import { useTheme } from "@/contexts/ThemeContext.tsx";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Button } from "@/components/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu.tsx";
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
  Plus,
  X,
} from "lucide-react";
import type { ModelItem } from "@/types/ModelItem.ts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/alert-dialog.tsx";

import React, { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog.tsx";
import { Input } from "@/components/input.tsx";
import { Label } from "@/components/label.tsx";
import { formatBytes } from "@/utils/BytesConverter.ts";
import { useAxiosConfig } from "@/services/AxiosConfig.ts";
import { Spinner } from "@/components/spinner.tsx";
import { Textarea } from "@/components/textarea.tsx";
import { type Category, ECADCategory } from "@/types/Category.ts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/popover.tsx";
import { Badge } from "@/components/badge.tsx";
import { Checkbox } from "@/components/checkbox.tsx";
import { useMutex } from "@/hooks/useMutex.ts";

function ModelListItem({
  item,
  onClick,
  refreshList,
}: {
  item: ModelItem;
  onClick: () => void;
  refreshList: () => void;
}) {
  const { theme } = useTheme();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  const [editData, setEditData] = useState<{
    alias: string;
    description: string;
    categories: Category[] | [];
  }>({
    alias: item.name || "",
    description: item.description || "",
    categories: item.categories || [],
  });

  const apiClient = useAxiosConfig();
  const isDarkTheme =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const animationSrc = isDarkTheme
    ? "https://lottie.host/84a02394-70c0-4d50-8cdb-8bc19f297682/iIKdhe0iAy.lottie"
    : "https://lottie.host/686ee0e1-ae73-4c41-b425-538a3791abb0/SB6QB9GRdW.lottie";

  const [isFavorite, setIsFavorite] = useState(item.isFavourite);
  const [isNew, setIsNew] = useState(item.isNew);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const { lockModel } = useMutex();

  const handleOpenModel = async (e?: React.MouseEvent) => {
    e?.stopPropagation(); // safe access (won’t throw if e is undefined)

    try {
      const result = await lockModel(item.id);
      if (!result.success) return;
      onClick();
    } catch (error) {
      console.error("Failed to open model:", error);
    }
  };

  const handleFavoriteToggle = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();

    const newFavoriteStatus = !isFavorite;
    setIsFavorite(newFavoriteStatus);

    try {
      await apiClient.put(`/api/model/${item.id}/details`, {
        newAlias: editData.alias.trim(),
        description: editData.description?.trim() || null,
        categories:
          editData?.categories?.length > 0 ? editData.categories : null,
        isFavourite: newFavoriteStatus,
      });

      if (refreshList) refreshList();
    } catch (error) {
      console.error("Failed to update favorite:", error);
      setIsFavorite(!newFavoriteStatus);
    }
  };

  const handleIsNewToggle = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();

    const newIsNewStatus = !isNew;
    setIsNew(newIsNewStatus);

    try {
      await apiClient.patch(`/api/model/${item.id}/isNew`);

      if (refreshList) refreshList();
    } catch (error) {
      console.error("Failed to update isNew:", error);
      setIsNew(!newIsNewStatus);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/model/${item.id}`);
      setIsDeleteDialogOpen(false);
      refreshList();
    } catch (e) {
      console.error("Failed to delete model:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveInfo = async () => {
    if (isSaving || !editData.alias.trim()) return;
    setIsSaving(true);
    try {
      await apiClient.put(`/api/model/${item.id}/details`, {
        newAlias: editData.alias.trim(),
        description: editData.description?.trim() || null,
        categories:
          editData?.categories?.length > 0 ? editData.categories : null,
        IsFavourite: isFavorite,
      });
      setIsEditOpen(false);
      refreshList();
    } catch (e) {
      console.error("Failed to save model info:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

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
            if (isNew) handleIsNewToggle(e);
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
                    onClick={stopPropagation}
                  >
                    <EllipsisVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={stopPropagation}>
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

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent onClick={stopPropagation}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the model and cannot be undone.{" "}
              <br />
              Type <span className="font-bold">delete</span> to confirm.
            </AlertDialogDescription>
            <Input
              type="text"
              name="delete-confirmation"
              className="mt-2"
              onChange={(e) => {
                setDeleteConfirmation(e.target.value);
              }}
              value={deleteConfirmation}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmation("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirmation !== "delete"}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Spinner /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent
          onClick={stopPropagation}
          onPointerDown={(e) => e.stopPropagation()}
          className="sm:max-w-[425px]"
        >
          <DialogHeader>
            <DialogTitle>Edit Model Info</DialogTitle>
            <DialogDescription>
              Make changes to your model here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="alias" className="text-right">
                Alias
              </Label>
              <Input
                id="alias"
                name="alias"
                value={editData.alias}
                onChange={handleEditChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={editData.description}
                onChange={handleEditChange}
                className="col-span-3"
                placeholder="A brief description of the model"
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Categories</Label>
              <div className="col-span-3 flex flex-wrap gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex flex-col gap-1 p-2">
                      <Label className="px-2 py-1.5 text-sm font-semibold">
                        Assign categories
                      </Label>
                      {Object.values(ECADCategory).map((value) => {
                        const isChecked = editData.categories.some(
                          (v) => v === value,
                        );
                        return (
                          <Label
                            key={value}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted font-normal cursor-pointer"
                          >
                            <Checkbox
                              id={`category-${value}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                setEditData((prev) => ({
                                  ...prev,
                                  categories: checked
                                    ? [...prev.categories, value]
                                    : prev.categories.filter(
                                        (v) => v !== value,
                                      ),
                                }));
                              }}
                            />
                            {value}
                          </Label>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                {editData.categories.map((category) => (
                  <Badge
                    key={category}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {category}
                    <button
                      type="button"
                      className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                      onClick={() => {
                        setEditData((prev) => ({
                          ...prev,
                          categories: prev.categories.filter(
                            (c) => c !== category,
                          ),
                        }));
                      }}
                    >
                      <X className="h-3 w-3 cursor-pointer" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                onClick={() => {
                  setEditData({
                    alias: item.name || "",
                    description: item.description || "",
                    categories: item.categories || [],
                  });
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleSaveInfo} disabled={isSaving}>
              {isSaving && <Spinner />}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ModelListItem;
