import { useState } from "react";
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

type ModelUploadDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function ModelUploadDialog({
  isOpen,
  onOpenChange,
}: ModelUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = () => {
    if (!file) {
      alert("No file selected!");
      return;
    }
    console.log("Uploading file:", file.name);
    const formData = new FormData();
    formData.append("model", file);

    alert(`Simulating upload for: ${file.name}`);
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
        <div className="py-4">
          <Uploader onFileSelect={setFile} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={!file}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
