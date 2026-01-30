import { useContext, useCallback } from "react";
import { MatrixContext } from "../MatrixContext";
import { getDatabase } from "@cmm/db";
import type { CapabilityMatrix } from "@cmm/core";

export function useMatrices() {
  const context = useContext(MatrixContext);
  if (!context) {
    throw new Error("useMatrices must be used within MatrixProvider");
  }

  const { state, dispatch } = context;

  // Load all matrices
  const loadMatrices = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const db = await getDatabase();
      const matrices = await db.getAllMatrices();
      dispatch({ type: "SET_MATRICES", payload: matrices });
    } catch (error) {
      console.error("Failed to load matrices:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to load matrices" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [dispatch]);

  // Create new matrix with 1 empty row (per user decision)
  const createMatrix = useCallback(
    async (name: string): Promise<CapabilityMatrix | null> => {
      try {
        const db = await getDatabase();
        const matrix = await db.createMatrix({ name, isImported: false });

        // Create 1 empty row
        await db.createMatrixRow({ matrixId: matrix.id });

        dispatch({ type: "ADD_MATRIX", payload: matrix });
        return matrix;
      } catch (error) {
        console.error("Failed to create matrix:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to create matrix" });
        return null;
      }
    },
    [dispatch]
  );

  // Delete matrix
  const deleteMatrix = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const db = await getDatabase();
        await db.deleteMatrix(id);
        dispatch({ type: "REMOVE_MATRIX", payload: id });

        // Clear active matrix ID if it was the deleted one
        const activeId = await db.getActiveMatrixId();
        if (activeId === id) {
          await db.setActiveMatrixId(null);
        }

        return true;
      } catch (error) {
        console.error("Failed to delete matrix:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to delete matrix" });
        return false;
      }
    },
    [dispatch]
  );

  // Rename matrix
  const renameMatrix = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      try {
        const db = await getDatabase();
        await db.updateMatrixName(id, name);
        dispatch({ type: "UPDATE_MATRIX_NAME", payload: { id, name } });
        return true;
      } catch (error) {
        console.error("Failed to rename matrix:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to rename matrix" });
        return false;
      }
    },
    [dispatch]
  );

  return {
    matrices: state.matrices,
    isLoading: state.isLoading,
    error: state.error,
    loadMatrices,
    createMatrix,
    deleteMatrix,
    renameMatrix,
  };
}
