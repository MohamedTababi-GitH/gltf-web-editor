import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSize(size: number): string {
  const inMB = size / 1024 / 1024;
  if (inMB < 1) return (size / 1024).toFixed(2) + " KB";
  return inMB.toFixed(2) + " MB";
}
