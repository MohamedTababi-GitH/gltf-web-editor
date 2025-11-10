import { File as FileIcon, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/shared/components/button.tsx";
import { formatBytes } from "@/shared/utils/BytesConverter.ts";
import type { DropzoneInputProps, DropzoneRootProps } from "react-dropzone";

type UploaderProps = {
  file: File | null;
  error: string | null;
  isDragActive: boolean;
  getRootProps: (props?: DropzoneRootProps) => DropzoneRootProps;
  getInputProps: (props?: DropzoneInputProps) => DropzoneInputProps;
  removeFile: () => void;
  hasRequiredFiles: boolean;
  requiredFiles: string[];
  additionalFiles: Map<string, File>;
  isAdditionalDragActive: boolean;
  getAdditionalRootProps: (props?: DropzoneRootProps) => DropzoneRootProps;
  getAdditionalInputProps: (props?: DropzoneInputProps) => DropzoneInputProps;
  removeAdditionalFile: (fileName: string) => void;
  allRequiredFilesUploaded: () => boolean;
};

export function Uploader({
  file,
  error,
  getRootProps,
  getInputProps,
  isDragActive,
  removeFile,
  hasRequiredFiles,
  requiredFiles,
  additionalFiles,
  getAdditionalRootProps,
  getAdditionalInputProps,
  isAdditionalDragActive,
  removeAdditionalFile,
  allRequiredFilesUploaded,
}: Readonly<UploaderProps>) {
  return (
    <div className="w-full space-y-4">
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

          {hasRequiredFiles && (
            <div className="w-full">
              <div className="mt-2 text-sm text-primary">
                <p className="font-semibold">
                  {requiredFiles.length} required file
                  {requiredFiles.length > 1 ? "s" : ""} needed:
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {requiredFiles.map((fileName) => {
                    const isUploaded = additionalFiles.has(fileName);
                    return (
                      <span
                        key={fileName}
                        className={`inline-flex items-center rounded px-2 py-1 text-xs ${
                          isUploaded
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {fileName}
                        {isUploaded && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-1 h-4 w-4 rounded-full p-0"
                            onClick={() => removeAdditionalFile(fileName)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              {!allRequiredFilesUploaded() && (
                <div
                  {...getAdditionalRootProps()}
                  className={cn(
                    "mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors",
                    isAdditionalDragActive
                      ? "border-primary bg-primary/10"
                      : "border-gray-300 hover:border-primary/50 dark:border-gray-700",
                  )}
                >
                  <input {...getAdditionalInputProps()} />
                  <UploadCloud
                    className={cn(
                      "h-6 w-6",
                      isAdditionalDragActive ? "text-primary" : "text-gray-400",
                    )}
                  />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Drop required files here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Files must match the required names exactly
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
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
