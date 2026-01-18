import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "../../lib/utils";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastProps {
  message: string;
  action?: ToastAction;
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  action,
  onClose,
  duration = 5000,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss after duration
    const dismissTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 200); // Match animation duration
  };

  const handleActionClick = () => {
    action?.onClick();
    handleClose();
  };

  return createPortal(
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "px-4 py-3 rounded-lg shadow-lg",
        "flex items-center gap-3 min-w-[280px] max-w-md",
        "transition-all duration-200 ease-out",
        "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]",
        isVisible && !isLeaving
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4"
      )}
      role="alert"
    >
      <span className="flex-1 text-sm">{message}</span>

      {action && (
        <button
          onClick={handleActionClick}
          className="text-sm font-medium text-[var(--primary)] hover:opacity-80 transition-colors"
        >
          {action.label}
        </button>
      )}

      <button
        onClick={handleClose}
        className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        aria-label="Dismiss"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>,
    document.body
  );
}
