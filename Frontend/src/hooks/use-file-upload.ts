import { useCallback, useState } from "react";
import { type Accept, type FileRejection, useDropzone } from "react-dropzone";

type FileUploadProps = {
  accept?: Accept;
  maxSize?: number; // in bytes
  maxFiles?: number;
};

const parseGLTF = (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          resolve([]);
          return;
        }

        // Make sure we have the result as a string
        const text =
          typeof event.target.result === "string"
            ? event.target.result
            : new TextDecoder().decode(
                new Uint8Array(event.target.result as ArrayBuffer),
              );

        const gltf = JSON.parse(text);
        const uris: string[] = [];

        // Extract URIs from buffers
        if (gltf.buffers && Array.isArray(gltf.buffers)) {
          gltf.buffers.forEach((buffer: { uri?: string }) => {
            if (buffer.uri) {
              uris.push(buffer.uri);
            }
          });
        }

        // Extract URIs from images
        if (gltf.images && Array.isArray(gltf.images)) {
          gltf.images.forEach((image: { uri?: string }) => {
            if (image.uri) {
              uris.push(image.uri);
            }
          });
        }

        resolve(uris);
      } catch (error) {
        console.error("Error parsing GLTF:", error);
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };

    reader.readAsText(file); // Use readAsText for JSON files
  });
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
  const [hasRequiredFiles, setHasRequiredFiles] = useState<boolean>(false);
  const [requiredFiles, setRequiredFiles] = useState<string[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<Map<string, File>>(
    new Map(),
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
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
        const uploadedFile = acceptedFiles[0];
        setFile(uploadedFile);

        if (uploadedFile.name.endsWith(".gltf")) {
          try {
            const fileNames = await parseGLTF(uploadedFile);
            if (fileNames.length > 0) {
              setRequiredFiles(fileNames);
              setHasRequiredFiles(true);
              // Reset additional files when a new main file is uploaded
              setAdditionalFiles(new Map());
            } else {
              setHasRequiredFiles(false);
              setRequiredFiles([]);
              setAdditionalFiles(new Map());
            }
          } catch (err) {
            console.error("Error parsing GLTF file:", err);
            setHasRequiredFiles(false);
            setRequiredFiles([]);
            setAdditionalFiles(new Map());
          }
        } else {
          // For GLB files or other types, no required files needed
          setHasRequiredFiles(false);
          setRequiredFiles([]);
          setAdditionalFiles(new Map());
        }
      }
    },
    [maxSize],
  );

  const onDropAdditionalFile = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        setError(
          "One or more required files could not be uploaded. Please check and try again.",
        );
        return;
      }

      if (acceptedFiles.length > 0) {
        const newFile = acceptedFiles[0];
        // Check if this file name matches one of the required files
        const isRequiredFile = requiredFiles.some(
          (requiredFile) => requiredFile === newFile.name,
        );

        if (isRequiredFile) {
          setAdditionalFiles((prev) =>
            new Map(prev).set(newFile.name, newFile),
          );
        } else {
          setError(
            `File ${newFile.name} does not match any of the required files.`,
          );
        }
      }
    },
    [requiredFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
  });

  const {
    getRootProps: getAdditionalRootProps,
    getInputProps: getAdditionalInputProps,
    isDragActive: isAdditionalDragActive,
  } = useDropzone({
    onDrop: onDropAdditionalFile,
    maxSize,
  });

  const removeFile = useCallback(() => {
    setFile(null);
    setError(null);
    setHasRequiredFiles(false);
    setRequiredFiles([]);
    setAdditionalFiles(new Map());
  }, []);

  const removeAdditionalFile = useCallback((fileName: string) => {
    setAdditionalFiles((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileName);
      return newMap;
    });
  }, []);

  const allRequiredFilesUploaded = useCallback(() => {
    if (!hasRequiredFiles) return true;
    return requiredFiles.every((file) => additionalFiles.has(file));
  }, [hasRequiredFiles, requiredFiles, additionalFiles]);

  return {
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
  };
};
