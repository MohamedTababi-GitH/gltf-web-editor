import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { formatDateTime } from "@/utils/DateTime.ts";
import { useTheme } from "@/components/theme-provider.tsx";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/alert-dialog.tsx";

import React, { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBytes } from "@/utils/BytesConverter.ts";
import { useAxiosConfig } from "@/services/AxiosConfig.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { type Category, ECADCategory } from "@/types/Category.ts";

function ModelListItem({
  item,
  onClick,
  refreshList,
  isLatest = false,
}: {
  item: ModelItem;
  onClick: () => void;
  refreshList: () => void;
  isLatest?: boolean;
}) {
  const { theme } = useTheme();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editData, setEditData] = useState<{
    alias: string;
    description: string;
    category: Category | null;
  }>({
    alias: item.name || "",
    description: item.description || "",
    category: item.category || "",
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

  const handleFavoriteToggle = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();

    const newFavoriteStatus = !isFavorite;
    setIsFavorite(newFavoriteStatus);

    try {
      await apiClient.put(`/api/model/${item.id}/details`, {
        newAlias: editData.alias.trim(),
        description: editData.description?.trim() || null,
        category: editData.category?.trim() || null,
        IsFavourite: newFavoriteStatus,
      });

      if (refreshList) refreshList();
    } catch (error) {
      console.error("Failed to update favorite:", error);
      setIsFavorite(!newFavoriteStatus);
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
        category: editData.category?.trim() || null,
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
        {isLatest && (
          <span className="absolute cursor-pointer top-0 left-0 inline-flex items-center w-15 rounded-br-xl rounded-tl-xl justify-center bg-linear-to-r from-indigo-500 to-indigo-700 px-2 py-1 text-xs font-semibold text-white">
            New
          </span>
        )}

        <Card
          className="flex flex-col max-w-md hover:bg-muted/65 transition-colors cursor-pointer overflow-hidden pb-0 gap-2"
          onClick={onClick}
        >
          <CardHeader className="pb-0 mt-2">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate w-50">
                  {item.name}
                </CardTitle>
                <CardDescription className={`min-h-8`}>
                  {item.category && (
                    <span className="inline-flex mt-1 items-center rounded-md gap-1 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      <Tags className={`size-4`} />
                      {item.category}
                    </span>
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

              <DropdownMenu>
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
                  <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                    <FilePenLine className="mr-2 h-4 w-4" />
                    <span>Edit Info</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href={item.url} download>
                      <Download className="mr-2 h-4 w-4" />
                      <span>Download</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onClick}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    <span>Open</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
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
            <div className="w-full border-t dark:bg-black">
              {item.additionalFiles && item.additionalFiles.length > 0 ? (
                item.additionalFiles.some(
                  (file) =>
                    file.contentType === "image/png" &&
                    file.name === "thumbnail.png",
                ) ? (
                  <img
                    src={
                      item.additionalFiles.find(
                        (file) =>
                          file.contentType === "image/png" &&
                          file.name === "thumbnail.png",
                      )?.url
                    }
                    alt="thumbnail"
                    className="w-full"
                  />
                ) : (
                  <DotLottieReact src={animationSrc} loop autoplay={false} />
                )
              ) : (
                <DotLottieReact src={animationSrc} loop autoplay={false} />
              )}
            </div>
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
              This will permanently delete the model and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Spinner /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent onClick={stopPropagation} className="sm:max-w-[425px]">
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fileAlias" className={`text-right`}>
                Category
              </Label>
              <div className="col-span-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 hover:text-foreground transition">
                      <Tags className="w-5 h-5" />
                      <span>{editData.category || "Choose a category"}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {Object.values(ECADCategory).map((value) => {
                      return (
                        <DropdownMenuItem
                          onClick={(e) => {
                            stopPropagation(e);
                            setEditData({
                              ...editData,
                              category: value,
                            });
                          }}
                        >
                          {value}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {editData.category && (
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-1" />
                <div className="col-span-3">
                  <Button
                    onClick={() => setEditData({ ...editData, category: null })}
                    className={`w-fit`}
                    variant={"link"}
                  >
                    Remove category
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
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
