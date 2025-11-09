import React, { useEffect, useState } from "react";

type PositionInputProps = {
  label: string;
  value: string;
  onCommit: (newValue: string) => void;
};

export const PositionInput = ({
  label,
  value,
  onCommit,
}: PositionInputProps) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setLocalValue(inputValue);

    const parsedInput = parseFloat(inputValue);
    const parsedValue = parseFloat(value);

    if (
      !isNaN(parsedInput) &&
      parsedInput.toString() === inputValue &&
      parsedInput !== parsedValue
    ) {
      onCommit(parsedInput.toString());
    }
  };

  const handleBlur = () => {
    if (localValue !== value) {
      const parsed = parseFloat(localValue);
      if (!isNaN(parsed)) {
        onCommit(parsed.toString());
      } else {
        setLocalValue(value);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex justify-between w-full text-left cursor-default  pl-2">
      <span className="font-medium text-sidebar-foreground/70">{label}</span>
      <input
        type="number"
        value={localValue}
        step={10}
        className="w-25 text-left border rounded px-1"
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};
