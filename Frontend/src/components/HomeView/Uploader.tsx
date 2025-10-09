import { File as FileIcon, UploadCloud, X } from "lucide-react";
import { useFileUpload } from "@/hooks/use-file-upload.ts";
import { cn } from "@/lib/utils.ts";
import { Button } from "../ui/button.tsx";
import { useEffect } from "react";

type UploaderProps = {
  onFileSelect: (file: File | null) => void;
};

export function Uploader({ onFileSelect }: UploaderProps) {
  const { file, error, getRootProps, getInputProps, isDragActive, removeFile } =
    useFileUpload({});

  useEffect(() => {
    onFileSelect(file);
  }, [file, onFileSelect]);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="w-full">
      {file ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-gray-200 p-6 dark:border-gray-800">
          <div className="flex w-full items-center justify-between gap-4 rounded-md bg-muted/50 p-3">
            <div className="flex items-center gap-3">
              <FileIcon className="h-8 w-8 text-gray-500" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {file.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={removeFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors",
            isDragActive
              ? "border-primary bg-primary/10"
              : "border-gray-300 hover:border-primary/50 dark:border-gray-700",
            error && "border-destructive bg-destructive/10",
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud
            className={cn(
              "h-12 w-12",
              isDragActive ? "text-primary" : "text-gray-400",
              error && "text-destructive",
            )}
          />
          <div className="text-center">
            {isDragActive ? (
              <p className="font-semibold text-primary">
                Drop the file here...
              </p>
            ) : (
              <>
                <p className="font-medium">
                  Drag & drop your file here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  .glb or .gltf, up to 25MB
                </p>
              </>
            )}
            {error && (
              <p className="mt-2 text-sm font-semibold text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
