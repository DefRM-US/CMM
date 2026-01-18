import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { cn } from "../../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
  disabled,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label ?? placeholder;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-left",
          "rounded-md shadow-sm text-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/50",
          "bg-[var(--input)] border border-[var(--border)]",
          disabled && "opacity-50 cursor-not-allowed",
          selectedOption ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
        )}
      >
        <span className="truncate">
          {displayText}
        </span>
        <ChevronDownIcon className={cn(
          "w-4 h-4 ml-2 flex-shrink-0 text-[var(--muted-foreground)] transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md shadow-lg py-1 max-h-60 overflow-auto bg-[var(--card)] border border-[var(--border)]">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">
              No options
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center w-full px-3 py-2 text-sm text-left transition-colors",
                  "hover:bg-[var(--accent)]",
                  option.value === value
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-[var(--foreground)]"
                )}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
