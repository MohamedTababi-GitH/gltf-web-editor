import type { Category } from "@/types/Category.ts";
import type { AdditionalFile } from "@/types/AdditionalFile.ts";

export interface ModelItem {
  id: string;
  name: string;
  sizeBytes: number;
  createdOn: string;
  format: string;
  url: string;
  category: Category;
  description: string;
  additionalFiles: AdditionalFile[];
  isFavourite: boolean;
}

export type MeshData = {
  name: string;
  id: number;
  X: string;
  Y: string;
  Z: string;
};
