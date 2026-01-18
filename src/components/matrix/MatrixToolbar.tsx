import { useState, useCallback } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Input } from "../ui/Input";
import type { CapabilityMatrix } from "../../types/matrix";

interface MatrixToolbarProps {
  matrices: CapabilityMatrix[];
  activeMatrixId: string | null;
  onSelectMatrix: (id: string | null) => void;
  onCreateMatrix: (name: string) => void;
  onDeleteMatrix: (id: string) => void;
  disabled?: boolean;
}

export function MatrixToolbar({
  matrices,
  activeMatrixId,
  onSelectMatrix,
  onCreateMatrix,
  onDeleteMatrix,
  disabled,
}: MatrixToolbarProps) {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newMatrixName, setNewMatrixName] = useState("");

  const matrixOptions = matrices.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  const activeMatrix = matrices.find((m) => m.id === activeMatrixId);

  const handleCreateMatrix = useCallback(() => {
    const name = newMatrixName.trim() || `Matrix ${matrices.length + 1}`;
    onCreateMatrix(name);
    setNewMatrixName("");
    setShowNewDialog(false);
  }, [newMatrixName, matrices.length, onCreateMatrix]);

  const handleDeleteMatrix = useCallback(() => {
    if (activeMatrixId) {
      onDeleteMatrix(activeMatrixId);
      setShowDeleteDialog(false);
    }
  }, [activeMatrixId, onDeleteMatrix]);

  const handleNewDialogKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCreateMatrix();
      }
    },
    [handleCreateMatrix]
  );

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-[var(--foreground)]">Matrix:</label>
        <Select
          options={matrixOptions}
          value={activeMatrixId}
          onChange={(value) => onSelectMatrix(value || null)}
          placeholder="Select a matrix..."
          className="w-64"
          disabled={disabled || matrices.length === 0}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => setShowNewDialog(true)}
          variant="primary"
          size="sm"
          disabled={disabled}
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          New Matrix
        </Button>

        {activeMatrixId && (
          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="danger"
            size="sm"
            disabled={disabled}
          >
            <TrashIcon className="w-4 h-4 mr-1" />
            Delete
          </Button>
        )}
      </div>

      {/* New Matrix Dialog */}
      <Dialog
        open={showNewDialog}
        onClose={() => {
          setShowNewDialog(false);
          setNewMatrixName("");
        }}
        title="Create New Matrix"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="matrix-name"
              className="block text-sm font-medium text-[var(--foreground)] mb-1"
            >
              Matrix Name
            </label>
            <Input
              id="matrix-name"
              type="text"
              value={newMatrixName}
              onChange={(e) => setNewMatrixName(e.target.value)}
              onKeyDown={handleNewDialogKeyDown}
              placeholder={`Matrix ${matrices.length + 1}`}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowNewDialog(false);
                setNewMatrixName("");
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateMatrix}>
              Create
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete Matrix"
      >
        <p className="text-[var(--muted-foreground)] mb-4">
          Are you sure you want to delete "{activeMatrix?.name}"? This will
          permanently remove all rows and cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowDeleteDialog(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteMatrix}>
            Delete Matrix
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
