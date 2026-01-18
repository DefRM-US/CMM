import { useState, useRef, useEffect, memo } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
          "flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[140px]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <ScoreBadge score={value} />
        <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 text-left">
          {getLabel(value)}
        </span>
        <ChevronDownIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[180px]">
          {scoreOptions.map((score) => (
            <button
              key={score ?? "null"}
              onClick={() => {
                onChange(score);
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors",
                score === value && "bg-blue-50 dark:bg-blue-900/30"
              )}
            >
              <ScoreBadge score={score} />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{getLabel(score)}</span>
                {score !== null && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {SCORE_CONFIG[score].description.split(" - ")[0]}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
