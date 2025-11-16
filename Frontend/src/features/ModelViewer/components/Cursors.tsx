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
  MoveHorizontal,
  RotateCw,
  Scaling,
  SquareStack,
} from "lucide-react";
import type { Cursor } from "@/features/ModelViewer/types/Cursor.ts";
import { Cursor as CursorEnum } from "@/features/ModelViewer/types/Cursor.ts";
import { type ComponentType } from "react";

type CursorProps = {
  setSelectedTool: (tool: Cursor) => void;
  selectedTool: string;
  collisionPrevention: boolean;
  setCollisionPrevention: React.Dispatch<React.SetStateAction<boolean>>;
};

type Tool = {
  name: Cursor;
  icon: ComponentType<LucideProps>;
  shortcut: string;
};

// eslint-disable-next-line react-refresh/only-export-components
export const tools: Tool[] = [
  { name: CursorEnum.Select, icon: MousePointer, shortcut: "S" },
  { name: CursorEnum.MultiSelect, icon: SquareStack, shortcut: "X" },
  { name: CursorEnum.Move, icon: Move, shortcut: "M" },
  { name: CursorEnum.Translate, icon: MoveHorizontal, shortcut: "T" },
  { name: CursorEnum.Scale, icon: Scaling, shortcut: "C" },
  { name: CursorEnum.Rotate, icon: RotateCw, shortcut: "R" },
];

function Cursors({
  setSelectedTool,
  selectedTool,
  collisionPrevention,
  setCollisionPrevention,
}: Readonly<CursorProps>) {
  return (
    <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2  sm:mt-4">
      <div className="flex flex-col items-center gap-1.5 lg:gap-2 rounded-md md:rounded-lg lg:rounded-xl border bg-popover/60 p-1.25 lg:p-2 text-popover-foreground shadow-lg backdrop-blur-xl">
        {tools.map((tool) => (
          <Tooltip key={tool.name}>
            <TooltipTrigger asChild={true}>
              <Button
                onClick={() => setSelectedTool(tool.name)}
                variant="default"
                size="icon"
                className={`rounded-sm md:rounded-md lg:rounded-lg w-7 h-7 md:w-9 md:h-9 lg:w-12 lg:h-12 ${tool.name === selectedTool ? "bg-primary text-background" : "bg-popover text-foreground hover:bg-popover/90 hover:text-foreground"}`}
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
        {/* Collision toggle button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setCollisionPrevention((prev) => !prev)}
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
            <p>Collision Prevention ({collisionPrevention ? "ON" : "OFF"})</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export default Cursors;
