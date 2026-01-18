import React, { useCallback, useMemo, useState, useRef, createContext, useContext, useEffect } from "react";
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

// Cell navigation context
interface CellNavigation {
  navigate: (rowId: string, colIndex: number, direction: "next" | "prev") => void;
  registerCell: (rowId: string, colIndex: number, element: HTMLElement | null) => void;
}

const CellNavigationContext = createContext<CellNavigation | null>(null);

export function useCellNavigation() {
  return useContext(CellNavigationContext);
}

interface MatrixTableProps {
  rows: CapabilityMatrixRow[];
  onUpdateRow: (rowId: string, updates: UpdateMatrixRowInput) => void;
  onDeleteRow: (rowId: string) => void;
  onReorderRows: (rows: CapabilityMatrixRow[]) => void;
  onAddRow: () => void;
}

const columnHelper = createColumnHelper<CapabilityMatrixRow>();

// Editable column indices: requirements=0, score=1, pastPerformance=2, comments=3
const EDITABLE_COLS = 4;

// Wrapper for EditableCell with navigation
function NavigableEditableCell({
  rowId,
  colIndex,
  ...props
}: React.ComponentProps<typeof EditableCell> & { colIndex: number }) {
  const nav = useCellNavigation();
  const divRef = useRef<HTMLDivElement>(null);

  // Register cell ref on mount
  useEffect(() => {
    if (divRef.current) {
      nav?.registerCell(rowId, colIndex, divRef.current);
    }
    return () => nav?.registerCell(rowId, colIndex, null);
  }, [nav, rowId, colIndex]);

  return (
    <div ref={divRef} tabIndex={-1}>
      <EditableCell
        {...props}
        rowId={rowId}
        onNavigate={(direction) => nav?.navigate(rowId, colIndex, direction)}
      />
    </div>
  );
}

// Wrapper for ScoreSelector with navigation
function NavigableScoreSelector({
  rowId,
  colIndex,
  ...props
}: React.ComponentProps<typeof ScoreSelector> & { rowId: string; colIndex: number }) {
  const nav = useCellNavigation();
  const divRef = useRef<HTMLDivElement>(null);

  // Register cell ref on mount
  useEffect(() => {
    if (divRef.current) {
      nav?.registerCell(rowId, colIndex, divRef.current);
    }
    return () => nav?.registerCell(rowId, colIndex, null);
  }, [nav, rowId, colIndex]);

  return (
    <div ref={divRef} tabIndex={-1}>
      <ScoreSelector
        {...props}
        onNavigate={(direction) => nav?.navigate(rowId, colIndex, direction)}
      />
    </div>
  );
}

export function MatrixTable({
  rows,
  onUpdateRow,
  onDeleteRow,
  onReorderRows,
  onAddRow,
}: MatrixTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Register a cell for navigation
  const registerCell = useCallback((rowId: string, colIndex: number, element: HTMLElement | null) => {
    const key = `${rowId}-${colIndex}`;
    if (element) {
      cellRefs.current.set(key, element);
    } else {
      cellRefs.current.delete(key);
    }
  }, []);

  // Navigate to next/prev cell
  const navigate = useCallback((rowId: string, colIndex: number, direction: "next" | "prev") => {
    const rowIndex = rows.findIndex(r => r.id === rowId);
    if (rowIndex === -1) return;

    let newRowIndex = rowIndex;
    let newColIndex = colIndex;

    if (direction === "next") {
      newColIndex++;
      if (newColIndex >= EDITABLE_COLS) {
        newColIndex = 0;
        newRowIndex++;
      }
    } else {
      newColIndex--;
      if (newColIndex < 0) {
        newColIndex = EDITABLE_COLS - 1;
        newRowIndex--;
      }
    }

    // Bounds check
    if (newRowIndex < 0 || newRowIndex >= rows.length) {
      return;
    }

    const newRowId = rows[newRowIndex].id;
    const key = `${newRowId}-${newColIndex}`;
    const element = cellRefs.current.get(key);

    if (element) {
      // For editable cells, trigger double-click to enter edit mode
      // For score selector, just focus
      element.focus();
      if (newColIndex !== 1) {
        // Trigger double-click for EditableCell
        element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      }
    }
  }, [rows]);

  const cellNavigation = useMemo(() => ({ navigate, registerCell }), [navigate, registerCell]);

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
          <span className="text-[var(--muted-foreground)] text-sm font-medium">
            {row.index + 1}
          </span>
        ),
      }),

      // Requirements (colIndex: 0)
      columnHelper.accessor("requirements", {
        header: "Requirements",
        size: 300,
        cell: ({ row, getValue }) => (
          <NavigableEditableCell
            value={getValue()}
            rowId={row.original.id}
            field="requirements"
            onUpdate={onUpdateRow}
            placeholder="Enter requirement..."
            colIndex={0}
          />
        ),
      }),

      // Experience and Capability (colIndex: 1)
      columnHelper.accessor("experienceAndCapability", {
        header: "Experience & Capability",
        size: 180,
        cell: ({ row, getValue }) => (
          <NavigableScoreSelector
            value={getValue()}
            onChange={(score) =>
              onUpdateRow(row.original.id, {
                experienceAndCapability: score,
              })
            }
            rowId={row.original.id}
            colIndex={1}
          />
        ),
      }),

      // Past Performance (colIndex: 2)
      columnHelper.accessor("pastPerformance", {
        header: "Past Performance",
        size: 200,
        cell: ({ row, getValue }) => (
          <NavigableEditableCell
            value={getValue()}
            rowId={row.original.id}
            field="pastPerformance"
            onUpdate={onUpdateRow}
            placeholder="Enter past performance..."
            colIndex={2}
          />
        ),
      }),

      // Comments (colIndex: 3)
      columnHelper.accessor("comments", {
        header: "Comments",
        size: 250,
        cell: ({ row, getValue }) => (
          <NavigableEditableCell
            value={getValue()}
            rowId={row.original.id}
            field="comments"
            onUpdate={onUpdateRow}
            placeholder="Enter comments..."
            colIndex={3}
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
            className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors p-1"
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
    <CellNavigationContext.Provider value={cellNavigation}>
    <div className="space-y-4">
      <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
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
                      className="px-4 py-3 text-left text-sm font-semibold text-[var(--foreground)] bg-[var(--muted)] border-b border-[var(--border)]"
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
        <p className="text-[var(--muted-foreground)] mb-4">
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
    </CellNavigationContext.Provider>
  );
}
