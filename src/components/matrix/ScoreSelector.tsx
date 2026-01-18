import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { SCORE_CONFIG, type Score } from "../../types/matrix";
import { ScoreBadge } from "./ScoreBadge";
import { cn } from "../../lib/utils";

interface ScoreSelectorProps {
  value: Score;
  onChange: (score: Score) => void;
  disabled?: boolean;
}

const scoreOptions: Score[] = [3, 2, 1, 0, null];

export function ScoreSelector({ value, onChange, disabled }: ScoreSelectorProps) {
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

  const getLabel = (score: Score): string => {
    if (score === null) return "Not rated";
    return SCORE_CONFIG[score].label;
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 transition-colors min-w-[140px]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <ScoreBadge score={value} />
        <span className="text-sm text-gray-600 flex-1 text-left">
          {getLabel(value)}
        </span>
        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[180px]">
          {scoreOptions.map((score) => (
            <button
              key={score ?? "null"}
              onClick={() => {
                onChange(score);
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-100 text-left transition-colors",
                score === value && "bg-blue-50"
              )}
            >
              <ScoreBadge score={score} />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{getLabel(score)}</span>
                {score !== null && (
                  <span className="text-xs text-gray-500">
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
}
