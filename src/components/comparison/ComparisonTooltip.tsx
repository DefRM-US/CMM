import { createPortal } from "react-dom";
import { ScoreBadge } from "../matrix/ScoreBadge";
import type { TooltipState } from "../../lib/comparison";

interface ComparisonTooltipProps extends TooltipState {}

export function ComparisonTooltip({
  matrixName,
  pastPerformance,
  comments,
  score,
  x,
  y,
}: ComparisonTooltipProps) {
  // Only show if there's content to display
  const hasPastPerformance = pastPerformance.trim() !== "";
  const hasComments = comments.trim() !== "";

  if (!hasPastPerformance && !hasComments) {
    return null;
  }

  // Calculate position with boundary checking
  const tooltipWidth = 320;
  const tooltipHeight = 200;
  const padding = 10;

  const left = Math.min(x + padding, window.innerWidth - tooltipWidth - padding);
  const top = Math.min(y + padding, window.innerHeight - tooltipHeight - padding);

  return createPortal(
    <div
      className="fixed z-50 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg p-3 max-w-sm pointer-events-none"
      style={{
        top,
        left,
        maxWidth: tooltipWidth,
      }}
      role="tooltip"
    >
      {/* Header with company name and score */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border)]">
        <span className="font-medium text-[var(--foreground)] truncate mr-2">
          {matrixName}
        </span>
        <ScoreBadge score={score} />
      </div>

      {/* Past Performance */}
      {hasPastPerformance && (
        <div className="mb-3">
          <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase mb-1">
            Past Performance
          </p>
          <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap line-clamp-4">
            {pastPerformance}
          </p>
        </div>
      )}

      {/* Comments */}
      {hasComments && (
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase mb-1">
            Comments
          </p>
          <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap line-clamp-4">
            {comments}
          </p>
        </div>
      )}
    </div>,
    document.body
  );
}
