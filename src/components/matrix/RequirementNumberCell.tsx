import { useState, useRef, useEffect, useCallback, memo } from "react";
import type { UpdateMatrixRowInput, CapabilityMatrixRow } from "../../types/matrix";
import {
  isValidRequirementNumber,
  suggestNextNumber,
  indentNumber,
  outdentNumber,
} from "../../lib/requirementNumber";

interface RequirementNumberCellProps {
  value: string;
  rowId: string;
  rowIndex: number;
  allRows: CapabilityMatrixRow[];
  onUpdate: (rowId: string, updates: UpdateMatrixRowInput) => void;
  onNavigate?: (direction: "next" | "prev") => void;
}

export const RequirementNumberCell = memo(function RequirementNumberCell({
  value,
  rowId,
  rowIndex,
  allRows,
  onUpdate,
  onNavigate,
}: RequirementNumberCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if current value is valid
  const isValid = isValidRequirementNumber(localValue);

  // Get previous row's requirement number for indent operation
  const previousRow = rowIndex > 0 ? allRows[rowIndex - 1] : null;
  const previousNumber = previousRow?.requirementNumber ?? "";

  // Sync local value when external value changes
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    // If empty, suggest a number based on previous row
    if (!value && previousNumber) {
      const suggested = suggestNextNumber(previousNumber);
      setLocalValue(suggested);
    } else if (!value && rowIndex === 0) {
      setLocalValue("1");
    }
    // Focus and select after render
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [value, previousNumber, rowIndex]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (localValue !== value) {
      onUpdate(rowId, { requirementNumber: localValue });
    }
  }, [localValue, value, rowId, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        inputRef.current?.blur();
      } else if (e.key === "Escape") {
        setLocalValue(value);
        setIsEditing(false);
      } else if (e.key === "Tab") {
        e.preventDefault();

        if (e.shiftKey) {
          // Shift+Tab: Outdent (if we have a value)
          if (localValue) {
            const newValue = outdentNumber(localValue);
            if (newValue !== localValue) {
              setLocalValue(newValue);
              onUpdate(rowId, { requirementNumber: newValue });
              return; // Stay in cell after outdent
            }
          }
          // If can't outdent or no value, navigate to previous cell
          if (localValue !== value) {
            onUpdate(rowId, { requirementNumber: localValue });
          }
          setIsEditing(false);
          onNavigate?.("prev");
        } else {
          // Tab: Check if we should indent or navigate
          // If cell has content and previous row exists, indent
          if (localValue && previousNumber) {
            const newValue = indentNumber(previousNumber);
            // Only indent if it would change the value and make it a child
            if (newValue !== localValue) {
              setLocalValue(newValue);
              onUpdate(rowId, { requirementNumber: newValue });
              return; // Stay in cell after indent
            }
          }
          // Otherwise navigate to next cell
          if (localValue !== value) {
            onUpdate(rowId, { requirementNumber: localValue });
          }
          setIsEditing(false);
          onNavigate?.("next");
        }
      }
    },
    [value, localValue, rowId, onUpdate, onNavigate, previousNumber]
  );

  // Validation indicator for display mode
  const displayIsValid = isValidRequirementNumber(value);

  // Display mode: show value with click to edit
  if (!isEditing) {
    return (
      <div
        onClick={startEditing}
        onFocus={startEditing}
        tabIndex={0}
        className={`min-h-[32px] py-1.5 px-2 text-sm font-mono cursor-text rounded hover:bg-[var(--accent)] transition-colors ${
          !displayIsValid && value ? "text-red-500" : ""
        }`}
        title={!displayIsValid && value ? "Invalid format" : undefined}
      >
        {value || <span className="text-[var(--muted-foreground)] italic">-</span>}
      </div>
    );
  }

  // Edit mode: show input with validation
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="1.1"
        className={`w-full min-h-[32px] text-sm px-2 py-1.5 rounded border-2 font-mono outline-none ${
          isValid
            ? "border-[var(--ring)] bg-[var(--background)]"
            : "border-red-500 bg-[var(--background)]"
        }`}
      />
      {!isValid && (
        <div className="absolute left-0 top-full mt-1 text-xs text-red-500 bg-[var(--background)] px-2 py-1 rounded shadow-lg border border-red-200 z-20 whitespace-nowrap">
          Use: 1, 1.2, 1.2.3
        </div>
      )}
    </div>
  );
});
