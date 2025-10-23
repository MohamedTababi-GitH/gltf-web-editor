import { useEffect, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Tags } from "lucide-react";

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
  const [category, setCategory] = useState<Category | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isUploadDisabled, setIsUploadDisabled] = useState<boolean>(false);

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

  const handleUpload = async () => {
    if (!file || !fileAlias || isUploading || description.trim().length > 512)
      return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("files", file);
    for (const requiredFile of requiredFiles) {
      formData.append("files", requiredFile);
    }
    formData.append("fileAlias", fileAlias.trim());
    formData.append("originalFileName", file.name);
    if (category?.trim()) {
      formData.append("category", category);
    }
    if (description?.trim()) {
      formData.append("description", description);
    }

    try {
      await apiClient.post("/api/model/upload", formData);
    } catch (error) {
      console.log(error);
    } finally {
      setFile(null);
      setFileAlias("");
      setIsUploading(false);
    }
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFile(null);
    }
    onOpenChange(open);
  };

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
            <div className="grid w-full max-w-sm items-center gap-3">
              <Label htmlFor="fileAlias">Category (Optional)</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:text-foreground transition">
                    <Tags className="w-5 h-5" />
                    <span>{category || "Choose a category"}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {Object.values(ECADCategory).map((value) => {
                    return (
                      <DropdownMenuItem onClick={() => setCategory(value)}>
                        {value}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              {category && (
                <Button
                  onClick={() => setCategory(null)}
                  className={`w-fit`}
                  variant={"link"}
                >
                  Remove category
                </Button>
              )}
            </div>
          </>
        )}
        <div className="py-4">
          <Uploader
            onFileSelect={setFile}
            setIsUploadDisabled={setIsUploadDisabled}
            setRequiredFiles={setRequiredFiles}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleUpload}
            disabled={!file || !fileAlias || isUploading || isUploadDisabled}
          >
            {isUploading && <Spinner />}
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
