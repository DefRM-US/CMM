import { useState, useRef, useEffect, useCallback } from "react";
import { PencilIcon } from "@heroicons/react/24/outline";

interface InlineEditableNameProps {
  value: string;
  onSave: (name: string) => void;
}

export function InlineEditableName({ value, onSave }: InlineEditableNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const trimmed = localValue.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setLocalValue(value);
    }
  }, [localValue, value, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        (e.currentTarget as HTMLInputElement).blur();
      } else if (e.key === "Escape") {
        setLocalValue(value);
        setIsEditing(false);
      }
    },
    [value]
  );

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="text-xl font-semibold text-[var(--foreground)] bg-[var(--input)] border border-[var(--primary)] rounded px-2 py-1 outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/50"
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className="group flex items-center gap-2 cursor-pointer"
      title="Double-click to edit"
    >
      <h2 className="text-xl font-semibold text-[var(--foreground)]">{value}</h2>
      <PencilIcon className="w-4 h-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
