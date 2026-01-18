import { memo } from "react";
import { cn } from "../../lib/utils";
import { SCORE_CONFIG, type Score } from "../../types/matrix";

interface ScoreBadgeProps {
  score: Score;
  className?: string;
}

export const ScoreBadge = memo(function ScoreBadge({ score, className }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <span
        className={cn(
          "score-badge bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]",
          className
        )}
      >
        -
      </span>
    );
  }

  const config = SCORE_CONFIG[score];

  return (
    <span className={cn("score-badge", config.bgClass, className)}>
      {score}
    </span>
  );
});
