import { Label } from "@/components/label.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/popover.tsx";
import { Button } from "@/components/button.tsx";
import { Plus, X } from "lucide-react";
import { type Category, ECADCategory } from "@/types/Category.ts";
import { Checkbox } from "@/components/checkbox.tsx";
import { Badge } from "@/components/badge.tsx";
import React from "react";

interface CategoryPickerProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

export const CategoryPicker = ({
  categories,
  setCategories,
}: CategoryPickerProps) => {
  return (
    <div className="grid grid-cols-4 items-start gap-4">
      <Label className="text-right pt-2">Categories</Label>
      <div className="col-span-3 flex flex-wrap gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex flex-col gap-1 p-2">
              <Label className="px-2 py-1.5 text-sm font-semibold">
                Assign categories
              </Label>
              {Object.values(ECADCategory).map((value) => {
                const isChecked = categories.some((v) => v === value);
                return (
                  <Label
                    key={value}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted font-normal cursor-pointer"
                  >
                    <Checkbox
                      id={`category-${value}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        setCategories((prev) =>
                          checked
                            ? [...prev, value]
                            : prev.filter((v) => v !== value),
                        );
                      }}
                    />
                    {value}
                  </Label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
        {categories.map((category) => (
          <Badge
            key={category}
            variant="secondary"
            className="flex items-center gap-1 pr-1"
          >
            {category}
            <button
              type="button"
              className="rounded-full hover:bg-muted-foreground/20 p-0.5"
              onClick={() => {
                setCategories((prev) => prev.filter((c) => c !== category));
              }}
            >
              <X className="h-3 w-3 cursor-pointer" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
};
