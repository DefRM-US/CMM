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
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">{matrix.name}</h3>
        <p className="text-sm text-gray-500">
          {matrix.rows.length} row{matrix.rows.length !== 1 ? "s" : ""} will be
          exported
        </p>
      </div>

      {/* Preview Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium text-gray-700 w-1/2">
                Requirements
              </th>
              <th className="px-4 py-2 font-medium text-gray-700 w-20 text-center">
                Score
              </th>
              <th className="px-4 py-2 font-medium text-gray-700">
                Past Performance
              </th>
              <th className="px-4 py-2 font-medium text-gray-700">Comments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {previewRows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-900">
                  <span className="line-clamp-2">{row.requirements}</span>
                </td>
                <td className="px-4 py-2 text-center">
                  <ScoreBadge score={row.experienceAndCapability} />
                </td>
                <td className="px-4 py-2 text-gray-600">
                  <span className="line-clamp-2">{row.pastPerformance}</span>
                </td>
                <td className="px-4 py-2 text-gray-600">
                  <span className="line-clamp-2">{row.comments}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show more indicator */}
      {remainingRows > 0 && (
        <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500 text-center border-t border-gray-200">
          ...and {remainingRows} more row{remainingRows !== 1 ? "s" : ""}
        </div>
      )}

      {/* Empty state */}
      {matrix.rows.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500">
          This matrix has no rows to export.
        </div>
      )}
    </div>
  );
}
