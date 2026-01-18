import { useEffect, useCallback, useState } from "react";
import { useMatrices } from "../../hooks/useMatrices";
import { useActiveMatrix } from "../../hooks/useActiveMatrix";
import { MatrixToolbar } from "./MatrixToolbar";
import { MatrixTable } from "./MatrixTable";
import { InlineEditableName } from "./InlineEditableName";
import { EmptyState } from "./EmptyState";
import { useToast } from "../../contexts/ToastContext";

export function MatrixEditor() {
  const {
    matrices,
    isLoading: matricesLoading,
    error,
    loadMatrices,
    createMatrix,
    deleteMatrix,
    renameMatrix,
  } = useMatrices();

  const {
    activeMatrix,
    isLoading: activeLoading,
    selectMatrix,
    addRow,
    updateRow,
    deleteRow,
    reorderRows,
  } = useActiveMatrix();

  const { showError } = useToast();
  const [initialized, setInitialized] = useState(false);

  // Load matrices on mount
  useEffect(() => {
    if (!initialized) {
      loadMatrices().then(() => setInitialized(true));
    }
  }, [initialized, loadMatrices]);

  // Show errors via toast
  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  const isLoading = matricesLoading || activeLoading;

  const handleCreateMatrix = useCallback(
    async (name: string) => {
      const matrix = await createMatrix(name);
      if (matrix) {
        await selectMatrix(matrix.id);
      }
    },
    [createMatrix, selectMatrix]
  );

  const handleDeleteMatrix = useCallback(
    async (id: string) => {
      await deleteMatrix(id);
      // Select first remaining matrix or null
      const remaining = matrices.filter((m) => m.id !== id);
      if (remaining.length > 0) {
        await selectMatrix(remaining[0].id);
      } else {
        await selectMatrix(null);
      }
    },
    [deleteMatrix, matrices, selectMatrix]
  );

  const handleRenameMatrix = useCallback(
    async (name: string) => {
      if (activeMatrix) {
        await renameMatrix(activeMatrix.id, name);
      }
    },
    [activeMatrix, renameMatrix]
  );

  const handleCreateFirstMatrix = useCallback(() => {
    handleCreateMatrix("Matrix 1");
  }, [handleCreateMatrix]);

  // Loading state
  if (!initialized || (isLoading && matrices.length === 0)) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Empty state - no matrices
  if (matrices.length === 0) {
    return <EmptyState onCreateMatrix={handleCreateFirstMatrix} />;
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <MatrixToolbar
        matrices={matrices}
        activeMatrixId={activeMatrix?.id ?? null}
        onSelectMatrix={selectMatrix}
        onCreateMatrix={handleCreateMatrix}
        onDeleteMatrix={handleDeleteMatrix}
        disabled={isLoading}
      />

      {/* Active matrix content */}
      {activeMatrix ? (
        <div className="space-y-4">
          {/* Matrix name (inline editable) */}
          <InlineEditableName
            value={activeMatrix.name}
            onSave={handleRenameMatrix}
          />

          {/* Matrix table */}
          <MatrixTable
            rows={activeMatrix.rows}
            onUpdateRow={updateRow}
            onDeleteRow={deleteRow}
            onReorderRows={reorderRows}
            onAddRow={addRow}
          />

          {/* Row count footer */}
          <div className="text-sm text-gray-500">
            {activeMatrix.rows.length} row
            {activeMatrix.rows.length !== 1 ? "s" : ""}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Select a matrix from the dropdown or create a new one.
        </div>
      )}
    </div>
  );
}
