import { useState, useCallback } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { ArrowUpTrayIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { Button } from "../ui/Button";
import { ExportPreview } from "./ExportPreview";
import { ExportModal } from "./ExportModal";
import {
  exportMatrixToExcel,
  workbookToBuffer,
  generateExportFilename,
  type ExportMetadata,
} from "../../lib/excel/exporter";
import type { CapabilityMatrixWithRows } from "../../types/matrix";
import { useToast } from "../../contexts/ToastContext";

interface ExportTabProps {
  /** Currently active matrix to export */
  activeMatrix: CapabilityMatrixWithRows | null;
}

export function ExportTab({ activeMatrix }: ExportTabProps) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { showError, showSuccess } = useToast();

  /**
   * Handle export to Excel file
   */
  const handleExport = useCallback(
    async (metadata: ExportMetadata) => {
      if (!activeMatrix) {
        showError("No matrix selected for export");
        return;
      }

      setIsExporting(true);

      try {
        // Generate filename suggestion
        const suggestedFilename = generateExportFilename(
          metadata.companyName,
          metadata.date
        );

        // Show save dialog
        const filePath = await save({
          title: "Save Capability Matrix",
          defaultPath: suggestedFilename,
          filters: [
            {
              name: "Excel Files",
              extensions: ["xlsx"],
            },
          ],
        });

        // User cancelled
        if (!filePath) {
          setIsExporting(false);
          return;
        }

        // Generate Excel workbook
        const workbook = await exportMatrixToExcel(activeMatrix, metadata);

        // Convert to buffer
        const buffer = await workbookToBuffer(workbook);

        // Write to file
        await writeFile(filePath, new Uint8Array(buffer));

        // Close modal on success
        setShowExportModal(false);
        showSuccess("Matrix exported successfully");
      } catch (err) {
        showError(
          `Failed to export: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        setIsExporting(false);
      }
    },
    [activeMatrix, showError, showSuccess]
  );

  return (
    <div className="space-y-6">
      {/* No active matrix warning */}
      {!activeMatrix && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please select or create a matrix in the Editor tab to export.
          </p>
        </div>
      )}

      {/* Export button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => setShowExportModal(true)}
          disabled={!activeMatrix || isExporting}
        >
          <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
          Export to Excel
        </Button>

        {isExporting && (
          <div className="flex items-center text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
            Exporting...
          </div>
        )}
      </div>

      {/* Active matrix info */}
      {activeMatrix && (
        <div className="text-sm text-gray-600">
          Exporting:{" "}
          <span className="font-medium text-gray-900">{activeMatrix.name}</span>
        </div>
      )}

      {/* Preview section */}
      {activeMatrix ? (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Export Preview</h2>
          <ExportPreview matrix={activeMatrix} />
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg mb-2">No matrix selected</p>
          <p className="text-sm">
            Select a matrix in the Editor tab to preview and export.
          </p>
        </div>
      )}

      {/* Export modal */}
      <ExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        matrix={activeMatrix}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </div>
  );
}
