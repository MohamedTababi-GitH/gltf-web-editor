export const Cursor = {
  Select: "Select",
  MultiSelect: "Multi-Select",
  Move: "Move",
  Translate: "Translate",
  Scale: "Scale",
  Rotate: "Rotate",
} as const;

export type Cursor = (typeof Cursor)[keyof typeof Cursor];
