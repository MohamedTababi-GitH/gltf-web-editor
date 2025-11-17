import type { ModelItem } from "@/shared/types/ModelItem";
import React, { useState } from "react";
import { useAxiosConfig } from "@/shared/services/AxiosConfig.ts";
import { useMutex } from "@/shared/hooks/useMutex.ts";
import type { Category } from "@/shared/types/Category.ts";

type ModelItemProps = {
  item: ModelItem;
  refreshList: () => void;
  onClick: () => void;
};

export const useModelItem = ({
  item,
  refreshList,
  onClick,
}: ModelItemProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(item.isFavourite);
  const [isNew, setIsNew] = useState(item.isNew);
  const [isLocking, setIsLocking] = useState(false);

  const apiClient = useAxiosConfig();
  const { lockModel } = useMutex();

  const handleOpenModel = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isLocking) return;
    try {
      setIsLocking(true);
      const result = await lockModel(item.id);
      if (!result.success) return;
      onClick();
      if (isNew) await handleIsNewToggle(e);
    } catch (error) {
      console.error("Failed to open model:", error);
    } finally {
      setIsLocking(false);
    }
  };

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavoriteStatus = !isFavorite;
    setIsFavorite(newFavoriteStatus);
    try {
      await apiClient.put(`/api/model/${item.id}/details`, {
        isFavourite: newFavoriteStatus,
        newAlias: item.name,
        description: item.description || null,
        categories: item.categories?.length > 0 ? item.categories : null,
      });
      refreshList();
    } catch {
      setIsFavorite(!newFavoriteStatus);
    }
  };

  const handleIsNewToggle = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsNew(false);
    try {
      await apiClient.patch(`/api/model/${item.id}/isNew`);
      refreshList();
    } catch {
      setIsNew(true);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/model/${item.id}`);
      setIsDeleteDialogOpen(false);
      refreshList();
    } catch (e) {
      console.error("Failed to delete model:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveInfo = async (data: {
    alias: string;
    description: string;
    categories: Category[] | [];
  }) => {
    setIsSaving(true);
    try {
      await apiClient.put(`/api/model/${item.id}/details`, {
        newAlias: data.alias.trim(),
        description: data.description?.trim() || null,
        categories: data.categories?.length > 0 ? data.categories : null,
        isFavourite: isFavorite,
      });
      setIsEditOpen(false);
      refreshList();
    } catch (e) {
      console.error("Failed to save model info:", e);
    } finally {
      setIsSaving(false);
    }
  };
  return {
    isNew,
    isFavorite,
    isActionMenuOpen,
    isEditOpen,
    isSaving,
    isDeleteDialogOpen,
    isDeleting,
    handleOpenModel,
    handleFavoriteToggle,
    handleDelete,
    handleSaveInfo,
    setIsActionMenuOpen,
    setIsEditOpen,
    setIsDeleteDialogOpen,
  };
};
