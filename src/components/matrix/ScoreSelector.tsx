import { useState, useRef, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { SCORE_CONFIG, type Score } from "../../types/matrix";
import { ScoreBadge } from "./ScoreBadge";
import { cn } from "../../lib/utils";

interface ScoreSelectorProps {
  value: Score;
  onChange: (score: Score) => void;
  disabled?: boolean;
  onNavigate?: (direction: "next" | "prev") => void;
}

const scoreOptions: Score[] = [3, 2, 1, 0, null];

export const ScoreSelector = memo(function ScoreSelector({ value, onChange, disabled, onNavigate }: ScoreSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInContainer = containerRef.current?.contains(target);
      const isInDropdown = dropdownRef.current?.contains(target);
      if (!isInContainer && !isInDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [isOpen]);

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

  // Handle Tab key for navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      setIsOpen(false);
      onNavigate?.(e.shiftKey ? "prev" : "next");
    }
  };

  const getLabel = (score: Score): string => {
    if (score === null) return "Not rated";
    return SCORE_CONFIG[score].label;
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--accent)] transition-colors min-w-[140px]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <ScoreBadge score={value} />
        <span className="text-sm text-[var(--muted-foreground)] flex-1 text-left">
          {getLabel(value)}
        </span>
        <ChevronDownIcon className="w-4 h-4 text-[var(--muted-foreground)]" />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50 bg-[var(--card)] border border-[var(--border)] rounded-md shadow-lg py-1 min-w-[180px]"
          style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
        >
          {scoreOptions.map((score) => (
            <button
              key={score ?? "null"}
              onClick={() => {
                onChange(score);
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 hover:bg-[var(--accent)] text-left transition-colors",
                score === value && "bg-[var(--primary)]/10"
              )}
            >
              <ScoreBadge score={score} />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--foreground)]">{getLabel(score)}</span>
                {score !== null && (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {SCORE_CONFIG[score].description.split(" - ")[0]}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
});
