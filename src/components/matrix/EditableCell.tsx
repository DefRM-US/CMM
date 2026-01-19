import { useState, useRef, useEffect, useCallback, memo } from "react";
import type { UpdateMatrixRowInput } from "../../types/matrix";

interface EditableCellProps {
  value: string;
  rowId: string;
  field: keyof Pick<
    UpdateMatrixRowInput,
    "requirements" | "pastPerformance" | "comments"
  >;
  onUpdate: (rowId: string, updates: UpdateMatrixRowInput) => void;
  placeholder?: string;
  onNavigate?: (direction: "next" | "prev") => void;
}

export const EditableCell = memo(function EditableCell({
  value,
  rowId,
  field,
  onUpdate,
  placeholder = "Enter text...",
  onNavigate,
}: EditableCellProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync local value when external value changes
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Select all text on focus for easy replacement
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (localValue !== value) {
      onUpdate(rowId, { [field]: localValue });
    }
  }, [localValue, value, rowId, field, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        (e.currentTarget as HTMLTextAreaElement).blur();
      } else if (e.key === "Escape") {
        setLocalValue(value);
        inputRef.current?.blur();
      } else if (e.key === "Tab") {
        e.preventDefault();
        // Save current value
        if (localValue !== value) {
          onUpdate(rowId, { [field]: localValue });
        }
        setIsFocused(false);
        // Navigate to next/prev cell
        onNavigate?.(e.shiftKey ? "prev" : "next");
      }
    },
    [value, localValue, rowId, field, onUpdate, onNavigate]
  );

  return (
    <textarea
      ref={inputRef}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`w-full min-h-[40px] resize-none text-sm px-2 py-1 rounded border transition-colors bg-transparent ${
        isFocused
          ? "border-[var(--ring)] bg-[var(--background)]"
          : "border-transparent hover:border-[var(--border)]"
      }`}
      rows={1}
    />
  );
});
