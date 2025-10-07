import { useCallback, useState } from "react";
import { type Accept, type FileRejection, useDropzone } from "react-dropzone";

type FileUploadProps = {
  accept?: Accept;
  maxSize?: number; // in bytes
  maxFiles?: number;
};

export const useFileUpload = ({
  accept = {
    "model/gltf-binary": [".glb"],
    "model/gltf+json": [".gltf"],
  },
  maxSize = 25 * 1024 * 1024, // 25MB
  maxFiles = 1,
}: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setError(null); // Clear previous errors

      if (fileRejections.length > 0) {
        const firstRejection = fileRejections[0];
        const firstError = firstRejection.errors[0];

        if (firstError.code === "file-too-large") {
          setError(
            `File is too large. Max size is ${maxSize / 1024 / 1024}MB.`,
          );
        } else if (firstError.code === "file-invalid-type") {
          setError("Invalid file type. Please upload a .glb or .gltf file.");
        } else {
          setError("An unknown error occurred.");
        }
        setFile(null); // Clear the file state on rejection
        return;
      }

      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    },
    [maxSize],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
  });

  const removeFile = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  return {
    file,
    error,
    getRootProps,
    getInputProps,
    isDragActive,
    removeFile,
  };
};
