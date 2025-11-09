import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog.tsx";
import { Button } from "@/components/button.tsx";
import { Uploader } from "@/features/HomeView/components/Uploader.tsx";
import { Input } from "@/components/input.tsx";
import { Label } from "@/components/label.tsx";
import { Spinner } from "@/components/spinner.tsx";
import ModelThumbnail from "@/features/HomeView/components/ModelThumbnail.tsx";
import { useModelUpload } from "@/features/HomeView/hooks/useModelUpload.ts";
import { CategoryPicker } from "@/features/HomeView/components/CategoryPicker.tsx";
import { useFileUpload } from "@/features/HomeView/hooks/useFileUpload.ts";
import { useEffect } from "react";

type ModelUploadDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function ModelUploadDialog({
  isOpen,
  onOpenChange,
}: ModelUploadDialogProps) {
  const {
    file,
    fileAlias,
    description,
    setFile,
    setFileAlias,
    setDescription,
    resetFields,
    handleSnapshot,
    handleUpload,
    canRenderThumbnail,
    isUploading,
    isUploadDisabled,
    setIsUploadDisabled,
    requiredFiles,
    setRequiredFiles,
    handleOpenChange,
    needsRequiredFiles,
    categories,
    setCategories,
  } = useModelUpload({ onOpenChange });
  const fileUpload = useFileUpload({});
  const {
    file: uploadedFile,
    allRequiredFilesUploaded,
    additionalFiles,
  } = fileUpload;
  useEffect(() => {
    setFile(uploadedFile);
  }, [uploadedFile, setFile]);

  useEffect(() => {
    setIsUploadDisabled(!allRequiredFilesUploaded());
    if (allRequiredFilesUploaded()) {
      setRequiredFiles(Array.from(additionalFiles.values()));
    }
  }, [
    allRequiredFilesUploaded,
    additionalFiles,
    setIsUploadDisabled,
    setRequiredFiles,
  ]);
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

            <CategoryPicker
              categories={categories}
              setCategories={setCategories}
            />

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
            {...fileUpload}
            removeFile={() => {
              fileUpload.removeFile();
              resetFields();
            }}
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
