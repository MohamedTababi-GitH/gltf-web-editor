import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  type LucideProps,
  MousePointer,
  Move,
  MoveHorizontal,
  RotateCw,
  Scaling,
  SquareStack,
} from "lucide-react";
import type { Cursor } from "@/types/Cursor.ts";
import { Cursor as CursorEnum } from "@/types/Cursor.ts";
import { type ComponentType } from "react";

function Cursors({
  setSelectedTool,
  selectedTool,
}: {
  setSelectedTool: (tool: Cursor) => void;
  selectedTool: string;
}) {
  const tools: {
    name: Cursor;
    icon: ComponentType<LucideProps>;
    shortcut: string;
  }[] = [
    { name: CursorEnum.Select, icon: MousePointer, shortcut: "S" },
    { name: CursorEnum.MultiSelect, icon: SquareStack, shortcut: "X" },
    { name: CursorEnum.Move, icon: Move, shortcut: "M" },
    { name: CursorEnum.Translate, icon: MoveHorizontal, shortcut: "T" },
    { name: CursorEnum.Scale, icon: Scaling, shortcut: "C" },
    { name: CursorEnum.Rotate, icon: RotateCw, shortcut: "R" },
  ];
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
      </div>
    </div>
  );
}

export default Cursors;
