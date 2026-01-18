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
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div>
          <h3 className="font-medium text-gray-900">{matrix.name}</h3>
          <p className="text-sm text-gray-500">
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
            {previewRows.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
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
    </div>
  );
}
