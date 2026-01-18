import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flexRender, type Row } from "@tanstack/react-table";
import type { CapabilityMatrixRow } from "../../types/matrix";

interface DraggableRowProps {
  row: Row<CapabilityMatrixRow>;
}

export function DraggableRow({ row }: DraggableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.original.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? "#f9fafb" : undefined,
  };

  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className="px-4 py-3 text-sm text-gray-700 border-b border-gray-200"
          style={{ width: cell.column.getSize() }}
        >
          {cell.column.id === "drag-handle" ? (
            <div
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none"
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </td>
      ))}
    </tr>
  );
}

// Drag handle icon component
export function DragHandle() {
  return (
    <div className="flex flex-col gap-0.5 items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600">
      <div className="w-3 h-0.5 bg-current rounded" />
      <div className="w-3 h-0.5 bg-current rounded" />
      <div className="w-3 h-0.5 bg-current rounded" />
    </div>
  );
}
