import type { Category } from "@/types/Category.ts";

export interface ModelItem {
  id: string;
  name: string;
  sizeBytes: number;
  createdOn: string;
  format: string;
  url: string;
  category: Category;
  description: string;
}
