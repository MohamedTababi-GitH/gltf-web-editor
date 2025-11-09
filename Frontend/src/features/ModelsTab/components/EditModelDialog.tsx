import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog.tsx";
import { Label } from "@/shared/components/label.tsx";
import { Input } from "@/shared/components/input.tsx";
import { Textarea } from "@/shared/components/textarea.tsx";
import { Button } from "@/shared/components/button.tsx";
import { type Category } from "@/shared/types/Category.ts";
import { Spinner } from "@/shared/components/spinner.tsx";
import type { ModelItem } from "@/shared/types/ModelItem";
import { CategoryPicker } from "@/features/HomeTab/components/CategoryPicker.tsx";
import React, { useEffect, useState } from "react";

type EditModelDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: {
    alias: string;
    description: string;
    categories: Category[] | [];
  }) => void;
  isSaving: boolean;
  item: ModelItem;
};

export function EditModelDialog({
  isOpen,
  onOpenChange,
  onSave,
  isSaving,
  item,
}: EditModelDialogProps) {
  const [editData, setEditData] = useState({
    alias: item.name || "",
    description: item.description || "",
    categories: item.categories || [],
  });

  useEffect(() => {
    setEditData({
      alias: item.name || "",
      description: item.description || "",
      categories: item.categories || [],
    });
  }, [item]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const setCategories = (
    updater: Category[] | ((prev: Category[] | []) => Category[] | []),
  ) => {
    setEditData((prev) => ({
      ...prev,
      categories:
        typeof updater === "function" ? updater(prev.categories) : updater,
    }));
  };
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="sm:max-w-[425px]"
      >
        <DialogHeader>
          <DialogTitle>Edit Model Info</DialogTitle>
          <DialogDescription>
            Make changes to your model here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="alias" className="text-right">
              Alias
            </Label>
            <Input
              id="alias"
              name="alias"
              value={editData.alias}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={editData.description}
              onChange={handleChange}
              className="col-span-3"
              placeholder="A brief description of the model"
            />
          </div>

          <CategoryPicker
            categories={editData.categories}
            setCategories={setCategories}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              onClick={() => {
                setEditData({
                  alias: item.name || "",
                  description: item.description || "",
                  categories: item.categories || [],
                });
              }}
              variant="outline"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={() => onSave(editData)} disabled={isSaving}>
            {isSaving && <Spinner />}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
