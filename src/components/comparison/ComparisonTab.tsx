import { useState, useEffect, useMemo, useCallback } from "react";
import {
  EyeIcon,
  EyeSlashIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { useMatrices } from "../../hooks/useMatrices";
import { ComparisonTable } from "./ComparisonTable";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Toast } from "../ui/Toast";
import { cn } from "../../lib/utils";
import {
  buildComparisonData,
  getRequirementDeleteInfo,
  type RequirementDeleteInfo,
} from "../../lib/comparison";
import {
  getMatrixWithRows,
  deleteRowsByRequirement,
  restoreRows,
} from "../../lib/database";
import type { CapabilityMatrixWithRows, CapabilityMatrixRow } from "../../types/matrix";

interface DeleteConfirmState {
  type: "matrix" | "requirement";
  matrixId?: string;
  matrixName?: string;
  requirement?: string;
  requirementInfo?: RequirementDeleteInfo;
}

interface ToastState {
  message: string;
  undoData?: {
    type: "matrix" | "requirement";
    deletedRows?: CapabilityMatrixRow[];
    matrixId?: string;
  };
}

export function ComparisonTab() {
  const { matrices, loadMatrices, deleteMatrix } = useMatrices();
  const [matricesWithRows, setMatricesWithRows] = useState<CapabilityMatrixWithRows[]>([]);
  const [hiddenMatrixIds, setHiddenMatrixIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Load all matrices with their rows
  useEffect(() => {
    const loadAllMatricesWithRows = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // First ensure matrices list is loaded
        await loadMatrices();
      } catch (err) {
        console.error("Failed to load matrices:", err);
        setError("Failed to load matrices");
        setIsLoading(false);
      }
    };

    loadAllMatricesWithRows();
  }, [loadMatrices]);

  // Load rows for all matrices when matrices list changes
  useEffect(() => {
    const loadRows = async () => {
      if (matrices.length === 0) {
        setMatricesWithRows([]);
        setIsLoading(false);
        return;
      }

      try {
        const results = await Promise.all(
          matrices.map((m) => getMatrixWithRows(m.id))
        );
        // Filter out nulls (matrices that were deleted)
        setMatricesWithRows(results.filter((m): m is CapabilityMatrixWithRows => m !== null));
      } catch (err) {
        console.error("Failed to load matrix rows:", err);
        setError("Failed to load matrix data");
      } finally {
        setIsLoading(false);
      }
    };

    loadRows();
  }, [matrices]);

  // Build comparison data from visible matrices
  const comparisonData = useMemo(() => {
    const visibleMatrices = matricesWithRows.filter(
      (m) => !hiddenMatrixIds.has(m.id)
    );
    return buildComparisonData(visibleMatrices);
  }, [matricesWithRows, hiddenMatrixIds]);

  // Toggle matrix visibility
  const toggleMatrixVisibility = useCallback((matrixId: string) => {
    setHiddenMatrixIds((prev) => {
      const next = new Set(prev);
      if (next.has(matrixId)) {
        next.delete(matrixId);
      } else {
        next.add(matrixId);
      }
      return next;
    });
  }, []);

  // Handle delete matrix request
  const handleDeleteMatrixRequest = useCallback(
    (matrixId: string, matrixName: string) => {
      setDeleteConfirm({
        type: "matrix",
        matrixId,
        matrixName,
      });
    },
    []
  );

  // Handle delete requirement request
  const handleDeleteRequirementRequest = useCallback(
    (requirement: string) => {
      const requirementInfo = getRequirementDeleteInfo(comparisonData, requirement);
      setDeleteConfirm({
        type: "requirement",
        requirement,
        requirementInfo,
      });
    },
    [comparisonData]
  );

  // Confirm delete matrix
  const confirmDeleteMatrix = useCallback(async () => {
    if (!deleteConfirm?.matrixId) return;

    const matrixId = deleteConfirm.matrixId;
    const matrixName = deleteConfirm.matrixName || "Matrix";

    // Close dialog
    setDeleteConfirm(null);

    // Delete the matrix
    const success = await deleteMatrix(matrixId);

    if (success) {
      // Remove from hidden set if it was hidden
      setHiddenMatrixIds((prev) => {
        const next = new Set(prev);
        next.delete(matrixId);
        return next;
      });

      // Show toast (no undo for matrix deletion - it's fully removed)
      setToast({
        message: `Deleted "${matrixName}"`,
      });
    }
  }, [deleteConfirm, deleteMatrix]);

  // Confirm delete requirement
  const confirmDeleteRequirement = useCallback(async () => {
    if (!deleteConfirm?.requirement) return;

    const requirement = deleteConfirm.requirement;

    // Close dialog
    setDeleteConfirm(null);

    try {
      // Delete the requirement from all matrices
      const result = await deleteRowsByRequirement(requirement);

      if (result.deletedCount > 0) {
        // Reload affected matrices
        const updatedMatrices = await Promise.all(
          matricesWithRows.map(async (m) => {
            if (result.affectedMatrixIds.includes(m.id)) {
              return getMatrixWithRows(m.id);
            }
            return m;
          })
        );
        setMatricesWithRows(
          updatedMatrices.filter((m): m is CapabilityMatrixWithRows => m !== null)
        );

        // Show toast with undo option
        setToast({
          message: `Deleted requirement from ${result.deletedCount} ${result.deletedCount === 1 ? "matrix" : "matrices"}`,
          undoData: {
            type: "requirement",
            deletedRows: result.deletedRows,
          },
        });
      }
    } catch (err) {
      console.error("Failed to delete requirement:", err);
      setError("Failed to delete requirement");
    }
  }, [deleteConfirm, matricesWithRows]);

  // Handle undo
  const handleUndo = useCallback(async () => {
    if (!toast?.undoData) return;

    const { undoData } = toast;

    // Clear toast immediately
    setToast(null);

    if (undoData.type === "requirement" && undoData.deletedRows) {
      try {
        // Restore the deleted rows
        await restoreRows(undoData.deletedRows);

        // Reload affected matrices
        const affectedMatrixIds = [...new Set(undoData.deletedRows.map((r) => r.matrixId))];
        const updatedMatrices = await Promise.all(
          matricesWithRows.map(async (m) => {
            if (affectedMatrixIds.includes(m.id)) {
              return getMatrixWithRows(m.id);
            }
            return m;
          })
        );
        setMatricesWithRows(
          updatedMatrices.filter((m): m is CapabilityMatrixWithRows => m !== null)
        );
      } catch (err) {
        console.error("Failed to undo:", err);
        setError("Failed to undo deletion");
      }
    }
  }, [toast, matricesWithRows]);

  // Close toast
  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  // Count visible matrices
  const visibleCount = matricesWithRows.length - hiddenMatrixIds.size;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--muted-foreground)]">Loading comparison data...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-[var(--destructive)] mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    );
  }

  // Empty state - no matrices at all
  if (matricesWithRows.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--muted-foreground)]">
        <TableCellsIcon className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)]" />
        <p className="text-lg mb-2">No matrices to compare</p>
        <p className="text-sm">
          Create or import matrices in the Editor and Import tabs to start
          comparing.
        </p>
      </div>
    );
  }

  // All hidden state
  if (visibleCount === 0) {
    return (
      <div className="space-y-6">
        {/* Visibility toggles */}
        <div>
          <p className="text-sm text-[var(--muted-foreground)] mb-3">Companies:</p>
          <div className="flex flex-wrap gap-2">
            {matricesWithRows.map((matrix) => (
              <button
                key={matrix.id}
                onClick={() => toggleMatrixVisibility(matrix.id)}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors",
                  "bg-[var(--muted)] text-[var(--muted-foreground)] line-through"
                )}
                title="Click to show this company"
              >
                <EyeSlashIcon className="w-4 h-4" />
                {matrix.name}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <EyeSlashIcon className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)]" />
          <p className="text-lg mb-2">All companies hidden</p>
          <p className="text-sm">
            Click on a company above to show it in the comparison.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          Comparing{" "}
          <span className="font-medium text-[var(--foreground)]">
            {comparisonData.rows.length}
          </span>{" "}
          requirements across{" "}
          <span className="font-medium text-[var(--foreground)]">{visibleCount}</span>{" "}
          {visibleCount === 1 ? "company" : "companies"}
          {hiddenMatrixIds.size > 0 && (
            <span className="text-[var(--muted-foreground)]">
              {" "}
              ({hiddenMatrixIds.size} hidden)
            </span>
          )}
        </p>
      </div>

      {/* Visibility toggles */}
      <div>
        <p className="text-sm text-[var(--muted-foreground)] mb-3">Companies:</p>
        <div className="flex flex-wrap gap-2">
          {matricesWithRows.map((matrix) => {
            const isHidden = hiddenMatrixIds.has(matrix.id);
            return (
              <button
                key={matrix.id}
                onClick={() => toggleMatrixVisibility(matrix.id)}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors",
                  isHidden
                    ? "bg-[var(--muted)] text-[var(--muted-foreground)] line-through"
                    : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
                )}
                title={isHidden ? "Click to show" : "Click to hide"}
              >
                {isHidden ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
                {matrix.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison table */}
      <ComparisonTable
        data={comparisonData}
        onDeleteMatrix={handleDeleteMatrixRequest}
        onDeleteRequirement={handleDeleteRequirementRequest}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={
          deleteConfirm?.type === "matrix"
            ? "Delete Company"
            : "Delete Requirement"
        }
      >
        {deleteConfirm?.type === "matrix" && (
          <div className="space-y-4">
            <p className="text-[var(--foreground)]">
              Are you sure you want to delete{" "}
              <strong>{deleteConfirm.matrixName}</strong>?
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              This will permanently remove this company and all its capability
              data.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDeleteMatrix}>
                Delete
              </Button>
            </div>
          </div>
        )}

        {deleteConfirm?.type === "requirement" && deleteConfirm.requirementInfo && (
          <div className="space-y-4">
            <p className="text-[var(--foreground)]">
              Delete this requirement from all companies?
            </p>
            <p className="text-sm text-[var(--muted-foreground)] bg-[var(--muted)] p-2 rounded line-clamp-2">
              "{deleteConfirm.requirement}"
            </p>
            {deleteConfirm.requirementInfo.companiesWithData.length > 0 && (
              <div>
                <p className="text-sm text-[var(--warning)] mb-2">
                  Companies with data in this row:
                </p>
                <ul className="text-sm text-[var(--muted-foreground)] space-y-1 max-h-32 overflow-y-auto">
                  {deleteConfirm.requirementInfo.companiesWithData.map((company) => (
                    <li key={company.matrixId} className="flex items-center gap-2">
                      <span className="text-[var(--muted-foreground)]">•</span>
                      <span className="font-medium">{company.matrixName}</span>
                      {company.score !== null && (
                        <span className="text-[var(--muted-foreground)]">
                          (score: {company.score}
                          {company.hasComments && ", has comments"}
                          {company.hasPastPerformance && ", has past performance"})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDeleteRequirement}>
                Delete from All
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Undo toast */}
      {toast && (
        <Toast
          message={toast.message}
          action={
            toast.undoData
              ? { label: "Undo", onClick: handleUndo }
              : undefined
          }
          onClose={closeToast}
        />
      )}
    </div>
  );
}
