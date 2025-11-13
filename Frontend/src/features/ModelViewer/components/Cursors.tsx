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
} from "lucide-react";
import type { Cursor } from "@/features/ModelViewer/types/Cursor.ts";
import { Cursor as CursorEnum } from "@/features/ModelViewer/types/Cursor.ts";
import React, { type ComponentType, useMemo } from "react";
import { Separator } from "@/shared/components/separator.tsx";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type CursorProps = {
  setSelectedTool: (tool: Cursor) => void;
  selectedTool: string;
  orbitRef: React.RefObject<OrbitControlsImpl | null>;
};

type CursorConfig = {
  name: Cursor;
  icon: ComponentType<LucideProps>;
  shortcut: string;
};

type Tool = {
  name: string;
  icon: ComponentType<LucideProps>;
  shortcut: string;
  onClick?: () => void;
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

type ToolConfigProps = {
  orbitRef: React.RefObject<OrbitControlsImpl | null>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const getTools = ({ orbitRef }: ToolConfigProps): Tool[] => [
  {
    name: "Reset Camera",
    icon: RotateCcw,
    shortcut: "B",
    onClick: () => {
      if (orbitRef?.current) {
        orbitRef.current.reset();
      }
    },
  },
];

function Cursors({
  setSelectedTool,
  selectedTool,
  orbitRef,
}: Readonly<CursorProps>) {
  const tools: Tool[] = useMemo(
    () =>
      getTools({
        orbitRef,
      }),
    [orbitRef],
  );
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
        {tools.map((tool) => (
          <Tooltip key={tool.name}>
            <TooltipTrigger asChild={true}>
              <Button
                variant="default"
                size="icon"
                onClick={tool.onClick}
                className={`rounded-sm md:rounded-md lg:rounded-lg w-7 h-7 md:w-9 md:h-9 lg:w-12 lg:h-12 ${
                  tool.name === selectedTool
                    ? "bg-primary text-background"
                    : "bg-popover text-foreground hover:bg-popover/90 hover:text-foreground"
                }`}
              >
                <tool.icon className="size-4 md:size-4 lg:size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>
                {tool.name} ({tool.shortcut})
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

export default Cursors;
