import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/tooltip.tsx";
import { Button } from "@/shared/components/button.tsx";
import {
  FoldHorizontal,
  type LucideProps,
  MousePointer,
  Move,
  Move3d,
  Rotate3d,
  RotateCcw,
  Scale3d,
  SquareStack,
  GitCompareIcon,
  ArrowLeftRight,
  ChevronDown,
  Check,
} from "lucide-react";
import type { Cursor } from "@/features/ModelViewer/types/Cursor.ts";
import { Cursor as CursorEnum } from "@/features/ModelViewer/types/Cursor.ts";
import { type ComponentType } from "react";
import { Separator } from "@/shared/components/separator.tsx";
import type { ToolConfig } from "./ThreeApp";
import type { StateFile } from "@/shared/types/StateFile.ts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/popover.tsx";
import type { useModelVersioning } from "@/features/ModelViewer/hooks/useModelVersioning.ts";
type VersioningType = ReturnType<typeof useModelVersioning>;

type CursorProps = {
  setSelectedTool: (tool: Cursor) => void;
  selectedTool: string;
  tools: ToolConfig[];
  versions: StateFile[];
  compareOpen: boolean;
  setCompareOpen: (open: boolean) => void;
  collisionPrevention: boolean;
  versioning: VersioningType;
  setLeftVersion: (leftVersion: StateFile | null) => void;
  leftVersion: StateFile | null | undefined;
};

type CursorConfig = {
  name: Cursor;
  icon: ComponentType<LucideProps>;
  shortcut: string;
  isTransformCursor: boolean;
};

// eslint-disable-next-line react-refresh/only-export-components
export const cursors: CursorConfig[] = [
  {
    name: CursorEnum.Select,
    icon: MousePointer,
    shortcut: "S",
    isTransformCursor: false,
  },
  {
    name: CursorEnum.MultiSelect,
    icon: SquareStack,
    shortcut: "X",
    isTransformCursor: false,
  },
  {
    name: CursorEnum.Move,
    icon: Move,
    shortcut: "M",
    isTransformCursor: false,
  },
  {
    name: CursorEnum.Translate,
    icon: Move3d,
    shortcut: "T",
    isTransformCursor: true,
  },
  {
    name: CursorEnum.Scale,
    icon: Scale3d,
    shortcut: "C",
    isTransformCursor: true,
  },
  {
    name: CursorEnum.Rotate,
    icon: Rotate3d,
    shortcut: "R",
    isTransformCursor: true,
  },
];

function Cursors({
  setSelectedTool,
  selectedTool,
  tools,
  versions,
  compareOpen,
  setCompareOpen,
  collisionPrevention,
  versioning,
  setLeftVersion,
  leftVersion,
}: Readonly<CursorProps>) {
  return (
    <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2  sm:mt-4">
      <div className="flex flex-col items-center gap-1.5 lg:gap-2 rounded-md md:rounded-lg lg:rounded-xl border bg-popover/60 p-1.25 lg:p-2 text-popover-foreground shadow-lg backdrop-blur-xl">
        {cursors.map((cursor) => (
          <Tooltip key={cursor.name}>
            <TooltipTrigger asChild={true}>
              <Button
                onClick={() => setSelectedTool(cursor.name)}
                variant="default"
                size="icon"
                disabled={versioning.isComparing && cursor.isTransformCursor}
                className={`rounded-sm md:rounded-md lg:rounded-lg w-7 h-7 md:w-9 md:h-9 lg:w-12 lg:h-12 ${
                  cursor.name === selectedTool
                    ? "bg-primary text-background"
                    : "bg-popover text-foreground hover:bg-popover/90 hover:text-foreground"
                }`}
              >
                <cursor.icon className="size-4 md:size-4 lg:size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>
                {cursor.name} ({cursor.shortcut})
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
        <Separator orientation={"horizontal"} />
        <Tooltip key={"Reset Camera"}>
          <TooltipTrigger asChild={true}>
            <Button
              variant="default"
              size="icon"
              onClick={
                tools.find((tool) => tool.name === "Reset Camera")?.onClick
              }
              className={`rounded-sm md:rounded-md lg:rounded-lg w-7 h-7 md:w-9 md:h-9 lg:w-12 lg:h-12 bg-popover text-foreground hover:bg-popover/90 hover:text-foreground`}
            >
              <RotateCcw className="size-4 md:size-4 lg:size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Reset Camera (B)</p>
          </TooltipContent>
        </Tooltip>
        <Popover open={compareOpen} onOpenChange={setCompareOpen}>
          <Tooltip>
            <PopoverTrigger asChild>
              <TooltipTrigger asChild={true}>
                <Button
                  variant="default"
                  size="icon"
                  className={`rounded-sm md:rounded-md lg:rounded-lg w-7 h-7 md:w-9 md:h-9 lg:w-12 lg:h-12 ${
                    compareOpen || versioning.isComparing
                      ? "bg-primary text-background"
                      : "bg-popover text-foreground hover:bg-popover/90 hover:text-foreground"
                  }`}
                >
                  <GitCompareIcon className="size-4 md:size-4 lg:size-5" />
                </Button>
              </TooltipTrigger>
            </PopoverTrigger>
            <TooltipContent side="right">
              <p>Compare Versions (D)</p>
            </TooltipContent>
          </Tooltip>

          <PopoverContent
            side="right"
            className="z-20 ml-2 bg-popover p-4 rounded-lg border shadow-lg w-60 md:w-96 space-y-4"
          >
            <h2 className="font-semibold text-lg mb-2">Compare Versions</h2>

            <div className="flex flex-col md:flex-row items-center justify-between gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    disabled={versioning.isComparing}
                    variant="outline"
                    className="flex-1 min-w-0 justify-between bg-background text-foreground"
                  >
                    <span className="truncate flex-1 min-w-0 text-left">
                      {leftVersion?.version || "Select version"}
                    </span>

                    <ChevronDown className="ml-1 h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[--radix-popover-trigger-width] p-2">
                  <div className="space-y-1">
                    {versions.map((v) => {
                      if (v.version === versioning.selectedVersion?.version)
                        return;
                      return (
                        <Button
                          key={v.version}
                          variant="ghost"
                          className="w-full justify-start flex items-center gap-2"
                          onClick={() => setLeftVersion(v)}
                        >
                          <span className="flex-1 text-left">{v.version}</span>

                          {leftVersion?.version === v.version && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              <ArrowLeftRight className="text-foreground size-4" />

              <div
                className={`flex flex-col flex-1 min-w-0 justify-center items-start`}
              >
                <div className={`text-[11px] text-primary/50 uppercase`}>
                  Selected Version
                </div>
                <div className={`text-xs`}>
                  {versioning.selectedVersion?.version}
                </div>
              </div>
            </div>

            {!versioning.isComparing && (
              <Button
                variant={"default"}
                className="w-full mt-2"
                disabled={!leftVersion}
                onClick={() => {
                  if (!leftVersion || !versioning?.selectedVersion) return;
                  versioning.startCompare(
                    leftVersion,
                    versioning?.selectedVersion,
                  );
                  setCompareOpen(true);
                }}
              >
                Compare
              </Button>
            )}
            {versioning.isComparing && (
              <Button
                className={`w-full bg-destructive/15 text-destructive/80 hover:bg-destructive/25 hover:text-destructive`}
                onClick={() => versioning.stopCompare()}
              >
                Stop Compare
              </Button>
            )}
          </PopoverContent>
        </Popover>
        {/* Collision toggle button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={
                tools.find((tool) => tool.name === "Collision Prevention")
                  ?.onClick
              }
              variant="default"
              size="icon"
              className={`rounded-sm md:rounded-md lg:rounded-lg w-7 h-7 md:w-9 md:h-9 lg:w-12 lg:h-12 ${
                collisionPrevention
                  ? "bg-primary text-background"
                  : "bg-popover text-foreground hover:bg-popover/90 hover:text-foreground"
              }`}
            >
              <FoldHorizontal className="size-4 md:size-4 lg:size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Collision Prevention (Z)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export default Cursors;
