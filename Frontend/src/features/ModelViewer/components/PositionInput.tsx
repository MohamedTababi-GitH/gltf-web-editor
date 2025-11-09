import { useEffect, useRef, useState } from "react";

type PositionInputProps = {
  label: string;
  value: string;
  onCommit: (newValue: number) => void;
};

export const PositionInput = ({
  label,
  value,
  onCommit,
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
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed)) {
      if (parsed.toFixed(3) !== parseFloat(value).toFixed(3)) {
        onCommit(parsed);
      }
    } else {
      setLocalValue(value);
    }
  };

  const commitOnEnter = () => {
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed)) {
      if (parsed.toFixed(3) !== parseFloat(value).toFixed(3)) {
        committedByEnter.current = true;
        onCommit(parsed);
      }
    } else {
      setLocalValue(value);
    }
  };

  return (
    <div className="flex justify-between w-full text-left cursor-default pl-2">
      <span className="font-medium text-sidebar-foreground/70">{label}</span>
      <input
        type="text"
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
