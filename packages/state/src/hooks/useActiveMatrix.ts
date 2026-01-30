import { useContext, useCallback, useEffect, useRef } from "react";
import { MatrixContext } from "../MatrixContext";
import { getDatabase } from "@cmm/db";
import { useDebouncedSave } from "./useDebouncedSave";
import { compareRequirementNumbers } from "@cmm/core";
import type { CapabilityMatrixRow, UpdateMatrixRowInput } from "@cmm/core";

export function useActiveMatrix() {
  const context = useContext(MatrixContext);
  if (!context) {
    throw new Error("useActiveMatrix must be used within MatrixProvider");
  }

  const { state, dispatch } = context;
  const queueSave = useDebouncedSave({
    delay: 500,
    onError: (error) => {
      dispatch({
        type: "SET_ERROR",
        payload: `Failed to save: ${error.message}`,
      });
    },
  });
  const initialLoadDone = useRef(false);

  // Select a matrix (load its rows)
  const selectMatrix = useCallback(
    async (id: string | null) => {
      const db = await getDatabase();

      if (!id) {
        await db.setActiveMatrixId(null);
        dispatch({ type: "SET_ACTIVE_MATRIX", payload: null });
        return;
      }

      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const matrixWithRows = await db.getMatrixWithRows(id);
        await db.setActiveMatrixId(id);

        // Sort rows by requirement number
        if (matrixWithRows) {
          matrixWithRows.rows = [...matrixWithRows.rows].sort((a, b) =>
            compareRequirementNumbers(a.requirementNumber, b.requirementNumber)
          );
        }

        dispatch({ type: "SET_ACTIVE_MATRIX", payload: matrixWithRows });
      } catch (error) {
        console.error("Failed to load matrix:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to load matrix" });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [dispatch]
  );

  // Add a new row
  const addRow = useCallback(async () => {
    if (!state.activeMatrix) return;

    try {
      const db = await getDatabase();
      const row = await db.createMatrixRow({
        matrixId: state.activeMatrix.id,
      });
      dispatch({ type: "ADD_ROW", payload: row });
    } catch (error) {
      console.error("Failed to add row:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to add row" });
    }
  }, [state.activeMatrix, dispatch]);

  // Update a row (optimistic + debounced save)
  const updateRow = useCallback(
    (rowId: string, updates: UpdateMatrixRowInput) => {
      // Optimistic update
      dispatch({ type: "UPDATE_ROW", payload: { id: rowId, updates } });
      // Queue debounced save
      queueSave(rowId, updates);
    },
    [dispatch, queueSave]
  );

  // Delete a row
  const deleteRow = useCallback(
    async (rowId: string) => {
      // Optimistic delete
      dispatch({ type: "REMOVE_ROW", payload: rowId });

      try {
        const db = await getDatabase();
        await db.deleteMatrixRow(rowId);
      } catch (error) {
        console.error("Failed to delete row:", error);
        // Reload to restore state on error
        if (state.activeMatrix) {
          const db = await getDatabase();
          const matrixWithRows = await db.getMatrixWithRows(
            state.activeMatrix.id
          );
          dispatch({ type: "SET_ACTIVE_MATRIX", payload: matrixWithRows });
        }
        dispatch({ type: "SET_ERROR", payload: "Failed to delete row" });
      }
    },
    [dispatch, state.activeMatrix]
  );

  // Reorder rows
  const reorderRows = useCallback(
    async (rows: CapabilityMatrixRow[]) => {
      // Update rowOrder for each row
      const updatedRows = rows.map((row, index) => ({
        ...row,
        rowOrder: index,
      }));

      // Optimistic update
      dispatch({ type: "REORDER_ROWS", payload: updatedRows });

      // Persist to database
      try {
        const db = await getDatabase();
        const updates = updatedRows.map((row) => ({
          id: row.id,
          rowOrder: row.rowOrder,
        }));
        await db.updateRowOrders(updates);
      } catch (error) {
        console.error("Failed to reorder rows:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to reorder rows" });
        // Reload to restore state on error
        if (state.activeMatrix) {
          const db = await getDatabase();
          const matrixWithRows = await db.getMatrixWithRows(
            state.activeMatrix.id
          );
          dispatch({ type: "SET_ACTIVE_MATRIX", payload: matrixWithRows });
        }
      }
    },
    [dispatch, state.activeMatrix]
  );

  // Restore active matrix on mount
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const restoreActive = async () => {
      const db = await getDatabase();
      const activeId = await db.getActiveMatrixId();
      if (activeId) {
        await selectMatrix(activeId);
      }
    };
    restoreActive();
  }, [selectMatrix]);

  return {
    activeMatrix: state.activeMatrix,
    isLoading: state.isLoading,
    selectMatrix,
    addRow,
    updateRow,
    deleteRow,
    reorderRows,
  };
}
