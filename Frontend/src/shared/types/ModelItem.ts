import type { Category } from "@/shared/types/Category.ts";
import type { AdditionalFile } from "@/shared/types/AdditionalFile.ts";
import type { StateFile } from "@/shared/types/StateFile.ts";

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
  baseline?: StateFile;
};
