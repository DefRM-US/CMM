import { TrashIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Button } from "../ui/Button";
import { ScoreBadge } from "../matrix/ScoreBadge";
import type { ParsedMatrix } from "../../lib/excel/importer";

interface ImportPreviewProps {
  matrix: ParsedMatrix;
  onImport: () => void;
  onRemove: () => void;
  isImporting?: boolean;
}

/** Maximum rows to show in preview */
const MAX_PREVIEW_ROWS = 10;

export function ImportPreview({
  matrix,
  onImport,
  onRemove,
  isImporting,
}: ImportPreviewProps) {
  const previewRows = matrix.rows.slice(0, MAX_PREVIEW_ROWS);
  const remainingRows = matrix.rows.length - MAX_PREVIEW_ROWS;

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--muted)] px-4 py-3 flex items-center justify-between border-b border-[var(--border)]">
        <div>
          <h3 className="font-medium text-[var(--foreground)]">{matrix.name}</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            {matrix.sourceFile}
            {matrix.sheetName && ` - ${matrix.sheetName}`}
            {" | "}
            {matrix.rows.length} row{matrix.rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onImport}
            disabled={isImporting}
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
            {isImporting ? "Importing..." : "Import"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRemove}
            disabled={isImporting}
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
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
            {previewRows.map((row, index) => (
              <tr key={index} className="hover:bg-[var(--accent)]">
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
    </div>
  );
}
