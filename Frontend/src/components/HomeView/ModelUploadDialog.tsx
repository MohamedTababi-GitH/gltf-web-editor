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
import { useNotification } from "@/contexts/NotificationContext.tsx";
import { useAxiosConfig } from "@/services/AxiosConfig.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";

type ModelUploadDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function ModelUploadDialog({
  isOpen,
  onOpenChange,
}: ModelUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileAlias, setFileAlias] = useState<string>();

  useEffect(() => {}, [file]);
  const { showNotification } = useNotification();
  const apiClient = useAxiosConfig();

  const handleUpload = async () => {
    if (!file || !fileAlias) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileAlias", fileAlias.trim());

    try {
      await apiClient.post("/api/model/upload", formData);
      showNotification("Successfully uploaded model!", "success");
    } catch (error) {
      console.log(error);
    } finally {
      setFile(null);
      setFileAlias("");
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
          <div className="grid w-full max-w-sm items-center gap-3">
            <Label htmlFor="fileAlias">File Alias</Label>
            <Input
              type="text"
              id="fileAlias"
              value={fileAlias}
              onChange={(e) => setFileAlias(e.target.value)}
              placeholder="Enter a file alias"
              required={true}
            />
          </div>
        )}
        <div className="py-4">
          <Uploader onFileSelect={setFile} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={!file || !fileAlias}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
