import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "../../lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  // Handle ESC key and backdrop click
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    const handleClick = (e: MouseEvent) => {
      // Close on backdrop click
      if (e.target === dialog) {
        onClose();
      }
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("click", handleClick);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("click", handleClick);
    };
  }, [onClose]);

  return createPortal(
    <dialog
      ref={dialogRef}
      className={cn(
        "rounded-xl shadow-xl p-0 max-w-md w-full",
        "backdrop:bg-black/60 backdrop:backdrop-blur-sm",
        "bg-[var(--card)] border border-[var(--border)]",
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          <button
            onClick={onClose}
            className={cn(
              "p-1 rounded-md transition-colors",
              "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              "hover:bg-[var(--accent)]",
              "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/50"
            )}
            aria-label="Close dialog"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="text-[var(--foreground)]">
          {children}
        </div>
      </div>
    </dialog>,
    document.body
  );
}
