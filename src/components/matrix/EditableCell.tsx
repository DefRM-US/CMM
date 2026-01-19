import { useState, useRef, useEffect, useCallback, memo, useLayoutEffect } from "react";
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
  placeholder = "Click to edit...",
  onNavigate,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  // Sync local value when external value changes
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  // Auto-resize textarea to fit content
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(textarea.scrollHeight, 32)}px`;
    }
  }, []);

  // Adjust height when value changes or when entering edit mode
  useLayoutEffect(() => {
    if (isEditing) {
      adjustHeight();
    }
  }, [isEditing, localValue, adjustHeight]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    // Focus and select after render
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 0);
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
        textareaRef.current?.blur();
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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  }, []);

  // Display mode: show text with click to edit
  if (!isEditing) {
    return (
      <div
        ref={displayRef}
        onClick={startEditing}
        onFocus={startEditing}
        tabIndex={0}
        className="w-full min-h-[32px] py-1.5 px-2 text-sm cursor-text rounded hover:bg-[var(--accent)] transition-colors"
      >
        {value ? (
          <span className="whitespace-pre-wrap break-words">{value}</span>
        ) : (
          <span className="text-[var(--muted-foreground)] italic">{placeholder}</span>
        )}
      </div>
    );
  }

  // Edit mode: show textarea
  return (
    <textarea
      ref={textareaRef}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className="w-full min-h-[32px] text-sm px-2 py-1.5 rounded border-2 border-[var(--ring)] bg-[var(--background)] resize-none outline-none"
      style={{ overflow: "hidden" }}
    />
  );
});
