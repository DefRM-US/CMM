import { ScoreBadge } from "../matrix/ScoreBadge";
import type { CapabilityMatrixWithRows } from "../../types/matrix";

interface ExportPreviewProps {
  matrix: CapabilityMatrixWithRows;
}

/** Maximum rows to show in preview */
const MAX_PREVIEW_ROWS = 10;

export function ExportPreview({ matrix }: ExportPreviewProps) {
  const sortedRows = [...matrix.rows].sort((a, b) => a.rowOrder - b.rowOrder);
  const previewRows = sortedRows.slice(0, MAX_PREVIEW_ROWS);
  const remainingRows = sortedRows.length - MAX_PREVIEW_ROWS;

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--muted)] px-4 py-3 border-b border-[var(--border)]">
        <h3 className="font-medium text-[var(--foreground)]">{matrix.name}</h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          {matrix.rows.length} row{matrix.rows.length !== 1 ? "s" : ""} will be
          exported
        </p>
      </div>

      {/* Preview Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--muted)] text-left">
            <tr>
              <th className="px-4 py-2 font-medium text-[var(--foreground)] w-1/2">
                Requirements
              </th>
              <th className="px-4 py-2 font-medium text-[var(--foreground)] w-20 text-center">
                Score
              </th>
              <th className="px-4 py-2 font-medium text-[var(--foreground)]">
                Past Performance
              </th>
              <th className="px-4 py-2 font-medium text-[var(--foreground)]">Comments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {previewRows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--accent)]">
                <td className="px-4 py-2 text-[var(--foreground)]">
                  <span className="line-clamp-2">{row.requirements}</span>
                </td>
                <td className="px-4 py-2 text-center">
                  <ScoreBadge score={row.experienceAndCapability} />
                </td>
                <td className="px-4 py-2 text-[var(--muted-foreground)]">
                  <span className="line-clamp-2">{row.pastPerformance}</span>
                </td>
                <td className="px-4 py-2 text-[var(--muted-foreground)]">
                  <span className="line-clamp-2">{row.comments}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show more indicator */}
      {remainingRows > 0 && (
        <div className="bg-[var(--muted)] px-4 py-2 text-sm text-[var(--muted-foreground)] text-center border-t border-[var(--border)]">
          ...and {remainingRows} more row{remainingRows !== 1 ? "s" : ""}
        </div>
      )}

      {/* Empty state */}
      {matrix.rows.length === 0 && (
        <div className="px-4 py-8 text-center text-[var(--muted-foreground)]">
          This matrix has no rows to export.
        </div>
      )}
    </div>
  );
}
