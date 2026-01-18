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
  placeholder = "Click to edit",
  onNavigate,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync local value when external value changes
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  // Focus and select on entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
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
        setIsEditing(false);
      } else if (e.key === "Tab") {
        e.preventDefault();
        // Save current value
        if (localValue !== value) {
          onUpdate(rowId, { [field]: localValue });
        }
        setIsEditing(false);
        // Navigate to next/prev cell
        onNavigate?.(e.shiftKey ? "prev" : "next");
      }
    },
    [value, localValue, rowId, field, onUpdate, onNavigate]
  );

  if (isEditing) {
    return (
      <textarea
        ref={inputRef}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="input w-full min-h-[60px] resize-none text-sm"
        rows={2}
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className="px-2 py-1 min-h-[40px] cursor-text rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm whitespace-pre-wrap"
    >
      {value || (
        <span className="text-gray-400 dark:text-gray-500 italic">{placeholder}</span>
      )}
    </div>
  );
});
