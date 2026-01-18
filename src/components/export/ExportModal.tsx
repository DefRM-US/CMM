import { useState, useEffect } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { getCurrentDate } from "../../lib/utils";
import type { CapabilityMatrixWithRows } from "../../types/matrix";
import type { ExportMetadata } from "../../lib/excel/exporter";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  matrix: CapabilityMatrixWithRows | null;
  onExport: (metadata: ExportMetadata) => Promise<void>;
  isExporting: boolean;
}

export function ExportModal({
  open,
  onClose,
  matrix,
  onExport,
  isExporting,
}: ExportModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [date, setDate] = useState("");
  const [version, setVersion] = useState("1.0");

  // Reset form with defaults when modal opens
  useEffect(() => {
    if (open && matrix) {
      setCompanyName(matrix.name);
      setDate(getCurrentDate());
      setVersion("1.0");
    }
  }, [open, matrix]);

  const handleExport = async () => {
    if (!companyName.trim()) return;

    await onExport({
      companyName: companyName.trim(),
      date,
      version,
    });
  };

  const canExport = companyName.trim().length > 0 && !isExporting;

  return (
    <Dialog open={open} onClose={onClose} title="Export to Excel">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="company-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Company Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="company-name"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name"
            autoFocus
          />
        </div>

        <div>
          <label
            htmlFor="export-date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Date
          </label>
          <Input
            id="export-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="export-version"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Version
          </label>
          <Input
            id="export-version"
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={!canExport}
          >
            {isExporting ? "Exporting..." : "Export to Excel"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
