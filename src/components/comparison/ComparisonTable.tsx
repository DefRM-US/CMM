import { useState, useCallback } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { ScoreBadge } from "../matrix/ScoreBadge";
import { ComparisonTooltip } from "./ComparisonTooltip";
import {
  type ComparisonData,
  type TooltipState,
  cellHasTooltipContent,
} from "../../lib/comparison";

interface ComparisonTableProps {
  data: ComparisonData;
  onDeleteMatrix: (matrixId: string, matrixName: string) => void;
  onDeleteRequirement: (requirement: string) => void;
}

export function ComparisonTable({
  data,
  onDeleteMatrix,
  onDeleteRequirement,
}: ComparisonTableProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleCellMouseEnter = useCallback(
    (
      e: React.MouseEvent,
      requirement: string,
      matrixId: string,
      matrixName: string,
      cell: { score: number | null; pastPerformance: string; comments: string } | undefined
    ) => {
      if (!cell || !cellHasTooltipContent(cell as any)) return;

      setTooltip({
        requirement,
        matrixId,
        matrixName,
        pastPerformance: cell.pastPerformance,
        comments: cell.comments,
        score: cell.score as 0 | 1 | 2 | 3 | null,
        x: e.clientX,
        y: e.clientY,
      });
    },
    []
  );

  const handleCellMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  if (data.rows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No requirements to compare.</p>
        <p className="text-sm mt-1">
          Add requirements to your matrices to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              {/* Requirements column header - sticky */}
              <th
                className="px-4 py-3 font-medium text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[300px] border-r border-gray-200"
              >
                Requirements
              </th>
              {/* Dynamic company columns */}
              {data.matrices.map((matrix) => (
                <th
                  key={matrix.id}
                  className="px-4 py-3 font-medium text-gray-700 text-center min-w-[120px]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className="truncate max-w-[100px]"
                      title={matrix.name}
                    >
                      {matrix.name}
                    </span>
                    <button
                      onClick={() => onDeleteMatrix(matrix.id, matrix.name)}
                      className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      title={`Delete ${matrix.name}`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.rows.map((row) => (
              <tr key={row.normalizedRequirement} className="hover:bg-gray-50">
                {/* Requirement cell with delete button - sticky */}
                <td className="px-4 py-3 text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => onDeleteRequirement(row.requirement)}
                      className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                      title="Delete requirement from all companies"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    <span className="line-clamp-3" title={row.requirement}>
                      {row.requirement}
                    </span>
                  </div>
                </td>
                {/* Score cells */}
                {data.matrices.map((matrix) => {
                  const cell = row.cells.get(matrix.id);
                  const hasTooltipContent = cellHasTooltipContent(cell);
                  return (
                    <td
                      key={matrix.id}
                      className={`px-4 py-3 text-center ${hasTooltipContent ? "cursor-help" : ""}`}
                      onMouseEnter={(e) =>
                        handleCellMouseEnter(
                          e,
                          row.requirement,
                          matrix.id,
                          matrix.name,
                          cell
                        )
                      }
                      onMouseLeave={handleCellMouseLeave}
                    >
                      <div className="flex justify-center">
                        <ScoreBadge score={cell?.score ?? null} />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {tooltip && <ComparisonTooltip {...tooltip} />}
    </div>
  );
}
