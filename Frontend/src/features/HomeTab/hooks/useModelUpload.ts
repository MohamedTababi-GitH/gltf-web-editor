import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Category } from "@/shared/types/Category.ts";
import { useNotification } from "@/shared/contexts/NotificationContext.tsx";
import { useAxiosConfig } from "@/shared/services/AxiosConfig.ts";
import { handleSaveScene } from "@/features/ModelViewer/utils/StateSaver.ts";
import * as THREE from "three";
import type { useFileUpload } from "@/features/HomeTab/hooks/useFileUpload.ts";

type FileUploadReturnType = ReturnType<typeof useFileUpload>;

type ModelUploadProps = {
  onOpenChange: (isOpen: boolean) => void;
  groupRef: React.RefObject<THREE.Group | null>;
  fileUpload: FileUploadReturnType;
};

export const useModelUpload = ({
  onOpenChange,
  groupRef,
  fileUpload,
}: ModelUploadProps) => {
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
  const apiClient = useAxiosConfig();

  useEffect(() => {
    if (!file) {
      setNeedsRequiredFiles(false);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    const isGltf = extension === "gltf";

    setNeedsRequiredFiles(isGltf);
  }, [file]);

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
      for (const category of categories) {
        formData.append("categories", category);
      }
    }
    if (description?.trim()) {
      formData.append("description", description);
    }
    const state = handleSaveScene(groupRef);
    formData.append("BaselineJson", state);

    try {
      await apiClient.post("/api/model/upload", formData);
      onOpenChange(false);
      resetFields();
      fileUpload.removeFile();
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
    groupRef,
    showNotification,
    apiClient,
    onOpenChange,
    resetFields,
    fileUpload,
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

  return {
    file,
    setFile,
    requiredFiles,
    setRequiredFiles,
    fileAlias,
    setFileAlias,
    description,
    setDescription,
    categories,
    setCategories,
    isUploading,
    isUploadDisabled,
    setIsUploadDisabled,
    thumbnail,
    needsRequiredFiles,
    canRenderThumbnail,
    handleSnapshot,
    handleUpload,
    handleOpenChange,
    resetFields,
  };
};
