import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Uploader } from "@/components/HomeView/Uploader.tsx";
import { useAxiosConfig } from "@/services/AxiosConfig.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { type Category, ECADCategory } from "@/types/Category.ts";
import { Plus, X } from "lucide-react";
import ModelThumbnail from "@/components/HomeView/ModelThumbnail.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { useNotification } from "@/contexts/NotificationContext.tsx";

type ModelUploadDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function ModelUploadDialog({
  isOpen,
  onOpenChange,
}: ModelUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [requiredFiles, setRequiredFiles] = useState<File[]>([]);
  const [fileAlias, setFileAlias] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [categories, setCategories] = useState<Category[] | []>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isUploadDisabled, setIsUploadDisabled] = useState<boolean>(false);
  const [thumbnail, setThumbnail] = useState<string | null>();
  const [needsRequiredFiles, setNeedsRequiredFiles] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (!file) {
      setNeedsRequiredFiles(false);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    const isGltf = extension === "gltf";

    setNeedsRequiredFiles(isGltf);
  }, [file]);

  const canRenderThumbnail = useMemo(() => {
    if (!file) return false;

    if (needsRequiredFiles) {
      return requiredFiles.length > 0;
    }

    return true;
  }, [file, needsRequiredFiles, requiredFiles]);

  const handleSnapshot = useCallback((image: string) => {
    setThumbnail(image);
  }, []);

  useEffect(() => {
    if (!file) return;
    if (
      file.name.split(".").pop() !== "glb" &&
      file.name.split(".").pop() !== "gltf"
    ) {
      setFile(null);
      setFileAlias("");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setFile(null);
      setFileAlias("");
      return;
    }
    setFileAlias(file.name.split(".").slice(0, -1).join(".") || "");
  }, [file]);

  const apiClient = useAxiosConfig();

  const resetFields = useCallback(() => {
    setFile(null);
    setFileAlias("");
    setDescription("");
    setCategories([]);
    setIsUploading(false);
    setThumbnail(null);
    setRequiredFiles([]);
    setNeedsRequiredFiles(false);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file || !fileAlias || isUploading) return;

    if (description.trim().length > 512) {
      showNotification("Description cannot exceed 512 characters.", "error");
      return;
    }

    if (needsRequiredFiles && requiredFiles.length === 0) {
      showNotification(
        "This model requires additional files. Please upload them.",
        "error",
      );
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("files", file);
    for (const requiredFile of requiredFiles) {
      formData.append("files", requiredFile);
    }
    if (thumbnail) {
      const response = await fetch(thumbnail);
      const blob = await response.blob();

      const thumbnailFile = new File([blob], "thumbnail.png", {
        type: "image/png",
      });

      formData.append("files", thumbnailFile);
    }

    formData.append("fileAlias", fileAlias.trim());
    formData.append("originalFileName", file.name);

    if (categories && categories.length > 0) {
      categories.forEach((category) => {
        formData.append("categories", category);
      });
    }
    if (description?.trim()) {
      formData.append("description", description);
    }

    try {
      await apiClient.post("/api/model/upload", formData);
      onOpenChange(false);
      resetFields();
    } catch (error) {
      console.log(error);
      showNotification("An unknown error occurred during upload.", "error");
    } finally {
      setIsUploading(false);
    }
  }, [
    file,
    fileAlias,
    isUploading,
    description,
    needsRequiredFiles,
    requiredFiles,
    thumbnail,
    categories,
    showNotification,
    apiClient,
    onOpenChange,
    resetFields,
  ]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetFields();
      }
      onOpenChange(open);
    },
    [onOpenChange, resetFields],
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Upload 3D Model</DialogTitle>
          <DialogDescription>
            Select a GLB or GLTF file to upload. Maximum size is 25MB.
          </DialogDescription>
        </DialogHeader>
        {file && (
          <>
            <div className="grid w-full max-w-sm items-center gap-3">
              <Label htmlFor="fileAlias">File Name</Label>
              <Input
                type="text"
                id="fileAlias"
                value={fileAlias}
                onChange={(e) => setFileAlias(e.target.value)}
                placeholder="Enter a file alias"
                required={true}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-3">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                type="text"
                id="description"
                maxLength={512}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a description"
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
                        const isChecked = categories.some((v) => v === value);
                        return (
                          <Label
                            key={value}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted font-normal cursor-pointer"
                          >
                            <Checkbox
                              id={`category-${value}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                setCategories((prev) =>
                                  checked
                                    ? [...prev, value]
                                    : prev.filter((v) => v !== value),
                                );
                              }}
                            />
                            {value}
                          </Label>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                {categories.map((category) => (
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
                        setCategories((prev) =>
                          prev.filter((c) => c !== category),
                        );
                      }}
                    >
                      <X className="h-3 w-3 cursor-pointer" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {canRenderThumbnail && file && (
              <ModelThumbnail
                gltfFile={file}
                dependentFiles={requiredFiles}
                onSnapshot={handleSnapshot}
              />
            )}
          </>
        )}
        <div className="py-4 mt-8">
          <Uploader
            resetFields={resetFields}
            onFileSelect={setFile}
            setIsUploadDisabled={setIsUploadDisabled}
            setRequiredFiles={setRequiredFiles}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={resetFields}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleUpload}
            disabled={
              !file ||
              !fileAlias ||
              isUploading ||
              isUploadDisabled ||
              (needsRequiredFiles && requiredFiles.length === 0)
            }
          >
            {isUploading && <Spinner />}
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
