import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/tooltip.tsx";
import { Button } from "@/shared/components/button.tsx";
import {
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
} from "lucide-react";
import type { Cursor } from "@/features/ModelViewer/types/Cursor.ts";
import { Cursor as CursorEnum } from "@/features/ModelViewer/types/Cursor.ts";
import { type ComponentType, useState } from "react";
import { Separator } from "@/shared/components/separator.tsx";
import type { ToolConfig } from "./ThreeApp";
import type { StateFile } from "@/shared/types/StateFile.ts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/popover.tsx";

type CursorProps = {
  setSelectedTool: (tool: Cursor) => void;
  selectedTool: string;
  tools: ToolConfig[];
  versions: StateFile[];
  compareOpen: boolean;
  setCompareOpen: (open: boolean) => void;
};

type CursorConfig = {
  name: Cursor;
  icon: ComponentType<LucideProps>;
  shortcut: string;
};

// eslint-disable-next-line react-refresh/only-export-components
export const cursors: CursorConfig[] = [
  { name: CursorEnum.Select, icon: MousePointer, shortcut: "S" },
  { name: CursorEnum.MultiSelect, icon: SquareStack, shortcut: "X" },
  { name: CursorEnum.Move, icon: Move, shortcut: "M" },
  { name: CursorEnum.Translate, icon: Move3d, shortcut: "T" },
  { name: CursorEnum.Scale, icon: Scale3d, shortcut: "C" },
  { name: CursorEnum.Rotate, icon: Rotate3d, shortcut: "R" },
];

function Cursors({
  setSelectedTool,
  selectedTool,
  tools,
  versions,
  compareOpen,
  setCompareOpen,
}: Readonly<CursorProps>) {
  const [leftVersion, setLeftVersion] = useState<StateFile | null>(null);
  const [rightVersion, setRightVersion] = useState<StateFile | null>(null);
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
                    compareOpen
                      ? "bg-primary text-background"
                      : "bg-popover text-foreground hover:bg-popover/90 hover:text-foreground"
                  }`}
                >
                  <GitCompareIcon className="size-4 md:size-4 lg:size-5" />
                </Button>
              </TooltipTrigger>
            </PopoverTrigger>
            <TooltipContent side="right">
              <p>Compare Versions</p>
            </TooltipContent>
          </Tooltip>

          <PopoverContent
            side="right"
            className="z-20 ml-2 bg-popover p-4 rounded-lg border shadow-lg w-60 md:w-96 space-y-4"
          >
            <h2 className="font-semibold text-lg mb-2">Compare Versions</h2>

            <div className="flex flex-col md:flex-row items-center justify-between gap-2">
              {/* LEFT VERSION POPOVER */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 min-w-0 justify-between bg-background text-foreground"
                  >
                    {leftVersion?.version || "Select version"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[--radix-popover-trigger-width] p-2">
                  <div className="space-y-1">
                    {versions.map((v) => (
                      <Button
                        key={v.version}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setLeftVersion(v);
                          setRightVersion(null);
                        }}
                      >
                        {v.version}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <ArrowLeftRight className="text-foreground" />

              {/* RIGHT VERSION POPOVER */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!leftVersion}
                    className={`flex-1 min-w-0 justify-between bg-background text-foreground ${
                      !leftVersion ? "opacity-40 cursor-not-allowed" : ""
                    }`}
                  >
                    {rightVersion?.version || "Select version"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[--radix-popover-trigger-width] p-2">
                  <div className="space-y-1">
                    {versions.map((v) => {
                      if (v.version === leftVersion?.version) return null;
                      return (
                        <Button
                          key={v.version}
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => setRightVersion(v)}
                        >
                          {v.version}
                        </Button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Compare button */}
            <Button
              className="w-full mt-2"
              disabled={!leftVersion || !rightVersion}
              onClick={() => {
                // logic
              }}
            >
              Compare
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export default Cursors;
