import { useCallback, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import type {
  CapabilityMatrixRow,
  UpdateMatrixRowInput,
} from "../../types/matrix";
import { DraggableRow, DragHandle } from "./DraggableRow";
import { EditableCell } from "./EditableCell";
import { ScoreSelector } from "./ScoreSelector";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

interface MatrixTableProps {
  rows: CapabilityMatrixRow[];
  onUpdateRow: (rowId: string, updates: UpdateMatrixRowInput) => void;
  onDeleteRow: (rowId: string) => void;
  onReorderRows: (rows: CapabilityMatrixRow[]) => void;
  onAddRow: () => void;
}

const columnHelper = createColumnHelper<CapabilityMatrixRow>();

export function MatrixTable({
  rows,
  onUpdateRow,
  onDeleteRow,
  onReorderRows,
  onAddRow,
}: MatrixTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = rows.findIndex((row) => row.id === active.id);
        const newIndex = rows.findIndex((row) => row.id === over.id);
        const reorderedRows = arrayMove(rows, oldIndex, newIndex);
        onReorderRows(reorderedRows);
      }
    },
    [rows, onReorderRows]
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirm) {
      onDeleteRow(deleteConfirm);
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, onDeleteRow]);

  const columns = useMemo(
    () => [
      // Drag handle column
      columnHelper.display({
        id: "drag-handle",
        header: "",
        size: 40,
        cell: () => <DragHandle />,
      }),

      // Row number
      columnHelper.display({
        id: "row-number",
        header: "#",
        size: 50,
        cell: ({ row }) => (
          <span className="text-gray-500 text-sm font-medium">
            {row.index + 1}
          </span>
        ),
      }),

      // Requirements
      columnHelper.accessor("requirements", {
        header: "Requirements",
        size: 300,
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            rowId={row.original.id}
            field="requirements"
            onUpdate={onUpdateRow}
            placeholder="Enter requirement..."
          />
        ),
      }),

      // Experience and Capability
      columnHelper.accessor("experienceAndCapability", {
        header: "Experience & Capability",
        size: 180,
        cell: ({ row, getValue }) => (
          <ScoreSelector
            value={getValue()}
            onChange={(score) =>
              onUpdateRow(row.original.id, {
                experienceAndCapability: score,
              })
            }
          />
        ),
      }),

      // Past Performance
      columnHelper.accessor("pastPerformance", {
        header: "Past Performance",
        size: 200,
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            rowId={row.original.id}
            field="pastPerformance"
            onUpdate={onUpdateRow}
            placeholder="Enter past performance..."
          />
        ),
      }),

      // Comments
      columnHelper.accessor("comments", {
        header: "Comments",
        size: 250,
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            rowId={row.original.id}
            field="comments"
            onUpdate={onUpdateRow}
            placeholder="Enter comments..."
          />
        ),
      }),

      // Delete button
      columnHelper.display({
        id: "actions",
        header: "",
        size: 50,
        cell: ({ row }) => (
          <button
            onClick={() => setDeleteConfirm(row.original.id)}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            aria-label="Delete row"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        ),
      }),
    ],
    [onUpdateRow]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-900 bg-gray-100 border-b border-gray-200"
                      style={{ width: header.getSize() }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              <SortableContext
                items={rowIds}
                strategy={verticalListSortingStrategy}
              >
                {table.getRowModel().rows.map((row) => (
                  <DraggableRow key={row.id} row={row} />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>

      <Button onClick={onAddRow} variant="secondary" size="sm">
        <PlusIcon className="w-4 h-4 mr-2" />
        Add Row
      </Button>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Row"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete this row? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteConfirm(null)}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
