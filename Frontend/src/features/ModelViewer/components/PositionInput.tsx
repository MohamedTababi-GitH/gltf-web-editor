import { useEffect, useRef, useState } from "react";
import { Input } from "@/shared/components/input.tsx";

type PositionInputProps = {
  id?: string;
  label: string;
  value: string;
  onCommit: (newValue: number) => void;
  disabled: boolean;
};

export const PositionInput = ({
  id,
  label,
  value,
  onCommit,
  disabled,
}: PositionInputProps) => {
  const [localValue, setLocalValue] = useState(value);
  const committedByEnter = useRef(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const commitValue = () => {
    if (committedByEnter.current) {
      committedByEnter.current = false;
      return;
    }
    const parsed = Number.parseFloat(localValue);
    if (Number.isNaN(parsed)) {
      setLocalValue(value);
    } else if (parsed.toFixed(3) !== Number.parseFloat(value).toFixed(3)) {
      onCommit(parsed);
    }
  };

  const commitOnEnter = () => {
    const parsed = Number.parseFloat(localValue);
    if (Number.isNaN(parsed)) {
      setLocalValue(value);
    } else if (parsed.toFixed(3) !== Number.parseFloat(value).toFixed(3)) {
      committedByEnter.current = true;
      onCommit(parsed);
    }
  };

  return (
    <div className="flex justify-between w-full text-left cursor-default pl-2">
      <span className="font-medium text-sidebar-foreground/70">{label}</span>
      <Input
        id={id}
        type="text"
        disabled={disabled}
        value={localValue}
        className="w-25 text-left border rounded px-1"
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commitValue}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commitOnEnter();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
};
