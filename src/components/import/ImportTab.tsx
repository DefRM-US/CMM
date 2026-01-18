import { useState, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  DocumentPlusIcon,
  FolderOpenIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../ui/Button";
import { ImportPreview } from "./ImportPreview";
import {
  parseExcelFile,
  getFilenameFromPath,
  type ParsedMatrix,
} from "../../lib/excel/importer";
import * as db from "../../lib/database";
import type { CapabilityMatrix } from "../../types/matrix";
import { useToast } from "../../contexts/ToastContext";

interface ImportTabProps {
  /** Currently selected template matrix (parent for imports) */
  activeMatrix: CapabilityMatrix | null;
  /** Callback when an import is completed successfully */
  onImportComplete: (matrixId: string) => void;
}

interface PendingMatrix extends ParsedMatrix {
  /** Unique key for React list rendering */
  key: string;
}

export function ImportTab({ activeMatrix, onImportComplete }: ImportTabProps) {
  const [pendingMatrices, setPendingMatrices] = useState<PendingMatrix[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const { showError, showSuccess } = useToast();

  /**
   * Open file picker and parse selected Excel files
   */
  const handleChooseFiles = useCallback(async () => {
    setIsLoading(true);

    try {
      const filePaths = await open({
        multiple: true,
        filters: [
          {
            name: "Excel Files",
            extensions: ["xlsx", "xls"],
          },
        ],
      });

      if (!filePaths || filePaths.length === 0) {
        setIsLoading(false);
        return;
      }

      const errors: string[] = [];
      const newMatrices: PendingMatrix[] = [];

      for (const filePath of filePaths) {
        try {
          // Convert file path to URL and fetch contents
          const fileUrl = convertFileSrc(filePath);
          const response = await fetch(fileUrl);
          const arrayBuffer = await response.arrayBuffer();
          const filename = getFilenameFromPath(filePath);

          // Parse the Excel file
          const result = parseExcelFile(arrayBuffer, filename);

          // Add parsed matrices with unique keys
          for (const matrix of result.matrices) {
            newMatrices.push({
              ...matrix,
              key: `${filename}-${matrix.sheetName || "default"}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            });
          }

          errors.push(...result.errors);
        } catch (fileError) {
          errors.push(
            `Failed to read ${filePath}: ${fileError instanceof Error ? fileError.message : "Unknown error"}`
          );
        }
      }

      // Add new matrices to pending list
      setPendingMatrices((prev) => [...prev, ...newMatrices]);

      if (errors.length > 0) {
        showError(errors.length === 1 ? errors[0] : `${errors.length} errors occurred while parsing files`);
      }
    } catch (err) {
      showError(
        `Failed to open files: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  /**
   * Remove a matrix from the pending list
   */
  const handleRemove = useCallback((key: string) => {
    setPendingMatrices((prev) => prev.filter((m) => m.key !== key));
  }, []);

  /**
   * Import a single matrix to the database
   */
  const handleImportOne = useCallback(
    async (pendingMatrix: PendingMatrix) => {
      if (!activeMatrix) {
        showError("Please select a template matrix first");
        return;
      }

      setImportingKey(pendingMatrix.key);

      try {
        // Create the matrix in the database
        const matrix = await db.createMatrix({
          name: pendingMatrix.name,
          isImported: true,
          sourceFile: pendingMatrix.sourceFile,
          parentMatrixId: activeMatrix.id,
        });

        // Create all rows
        for (let i = 0; i < pendingMatrix.rows.length; i++) {
          const row = pendingMatrix.rows[i];
          await db.createMatrixRow({
            matrixId: matrix.id,
            requirements: row.requirements,
            experienceAndCapability: row.experienceAndCapability,
            pastPerformance: row.pastPerformance,
            comments: row.comments,
            rowOrder: i,
          });
        }

        // Remove from pending list
        setPendingMatrices((prev) =>
          prev.filter((m) => m.key !== pendingMatrix.key)
        );

        showSuccess(`Imported "${pendingMatrix.name}" successfully`);

        // Notify parent
        onImportComplete(matrix.id);
      } catch (err) {
        showError(
          `Failed to import ${pendingMatrix.name}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        setImportingKey(null);
      }
    },
    [activeMatrix, onImportComplete, showError, showSuccess]
  );

  /**
   * Import all pending matrices
   */
  const handleImportAll = useCallback(async () => {
    if (!activeMatrix) {
      showError("Please select a template matrix first");
      return;
    }

    if (pendingMatrices.length === 0) return;

    setIsLoading(true);
    const errors: string[] = [];
    let lastImportedId: string | null = null;
    let successCount = 0;

    for (const pendingMatrix of pendingMatrices) {
      try {
        // Create the matrix in the database
        const matrix = await db.createMatrix({
          name: pendingMatrix.name,
          isImported: true,
          sourceFile: pendingMatrix.sourceFile,
          parentMatrixId: activeMatrix.id,
        });

        // Create all rows
        for (let i = 0; i < pendingMatrix.rows.length; i++) {
          const row = pendingMatrix.rows[i];
          await db.createMatrixRow({
            matrixId: matrix.id,
            requirements: row.requirements,
            experienceAndCapability: row.experienceAndCapability,
            pastPerformance: row.pastPerformance,
            comments: row.comments,
            rowOrder: i,
          });
        }

        lastImportedId = matrix.id;
        successCount++;
      } catch (err) {
        errors.push(
          `Failed to import ${pendingMatrix.name}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    // Clear pending list
    setPendingMatrices([]);

    if (errors.length > 0) {
      showError(`${errors.length} of ${pendingMatrices.length} imports failed`);
    } else {
      showSuccess(`Imported ${successCount} matrices successfully`);
    }

    // Notify parent with the last imported matrix
    if (lastImportedId) {
      onImportComplete(lastImportedId);
    }

    setIsLoading(false);
  }, [activeMatrix, pendingMatrices, onImportComplete, showError, showSuccess]);

  return (
    <div className="space-y-6">
      {/* No active matrix warning */}
      {!activeMatrix && (
        <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-lg p-4">
          <p className="text-[var(--secondary-foreground)]">
            Please select or create a template matrix in the Editor tab before
            importing. Imported matrices will be linked to the selected
            template.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button onClick={handleChooseFiles} disabled={isLoading}>
          <FolderOpenIcon className="w-5 h-5 mr-2" />
          {pendingMatrices.length > 0 ? "Add More Files" : "Choose Excel Files"}
        </Button>

        {pendingMatrices.length > 0 && (
          <Button
            onClick={handleImportAll}
            disabled={isLoading || !activeMatrix}
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Import All ({pendingMatrices.length})
          </Button>
        )}

        {isLoading && (
          <div className="flex items-center text-[var(--muted-foreground)]">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--primary)] mr-2" />
            Processing...
          </div>
        )}
      </div>

      {/* Active template info */}
      {activeMatrix && (
        <div className="text-sm text-[var(--muted-foreground)]">
          Importing to template:{" "}
          <span className="font-medium text-[var(--foreground)]">{activeMatrix.name}</span>
        </div>
      )}

      {/* Pending matrices list */}
      {pendingMatrices.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-[var(--foreground)]">
            Ready to Import ({pendingMatrices.length})
          </h2>

          <div className="space-y-4">
            {pendingMatrices.map((matrix) => (
              <ImportPreview
                key={matrix.key}
                matrix={matrix}
                onImport={() => handleImportOne(matrix)}
                onRemove={() => handleRemove(matrix.key)}
                isImporting={importingKey === matrix.key}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <DocumentPlusIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No files selected</p>
          <p className="text-sm">
            Click "Choose Excel Files" to select capability matrices to import.
          </p>
        </div>
      )}
    </div>
  );
}
