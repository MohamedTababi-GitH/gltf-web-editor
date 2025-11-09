import type { Category } from "@/types/Category.ts";
import type { AdditionalFile } from "@/types/AdditionalFile.ts";
import type { StateFile } from "@/types/StateFile.ts";

export type ModelItem = {
  id: string;
  name: string;
  sizeBytes: number;
  createdOn: string;
  format: string;
  url: string;
  categories: Category[];
  description: string;
  additionalFiles: AdditionalFile[];
  stateFiles: StateFile[];
  assetId: string;
  isFavourite: boolean;
  isNew: boolean;
};
