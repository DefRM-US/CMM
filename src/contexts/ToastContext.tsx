import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "../lib/utils";
import { generateId } from "../lib/utils";

// Toast types
export type ToastType = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  duration?: number;
}

// State and actions
interface ToastState {
  toasts: Toast[];
}

type ToastAction_Internal =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: string };

function toastReducer(state: ToastState, action: ToastAction_Internal): ToastState {
  switch (action.type) {
    case "ADD_TOAST":
      return { toasts: [...state.toasts, action.toast] };
    case "REMOVE_TOAST":
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}

// Context
interface ToastContextValue {
  showToast: (message: string, options?: { type?: ToastType; action?: ToastAction; duration?: number }) => void;
  showError: (message: string, action?: ToastAction) => void;
  showSuccess: (message: string, action?: ToastAction) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Hook
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Individual toast item component
function ToastItem({
  toast,
  onClose,
  index,
}: {
  toast: Toast;
  onClose: () => void;
  index: number;
}) {
  const handleActionClick = () => {
    toast.action?.onClick();
    onClose();
  };

  const bgColor = {
    success: "bg-green-800",
    error: "bg-red-800",
    info: "bg-gray-900",
  }[toast.type];

  return (
    <div
      className={cn(
        "flex items-center gap-3 min-w-[280px] max-w-md",
        "px-4 py-3 rounded-lg shadow-lg",
        "text-white",
        "animate-slide-up",
        bgColor
      )}
      style={{ marginBottom: index > 0 ? "0.5rem" : 0 }}
      role="alert"
    >
      <span className="flex-1 text-sm">{toast.message}</span>

      {toast.action && (
        <button
          onClick={handleActionClick}
          className="text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors"
        >
          {toast.action.label}
        </button>
      )}

      <button
        onClick={onClose}
        className="text-gray-300 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

// Toast container that renders all toasts
function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse items-center gap-2">
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
          index={index}
        />
      ))}
    </div>,
    document.body
  );
}

// Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });

  const removeToast = useCallback((id: string) => {
    dispatch({ type: "REMOVE_TOAST", id });
  }, []);

  const showToast = useCallback(
    (
      message: string,
      options?: { type?: ToastType; action?: ToastAction; duration?: number }
    ) => {
      const toast: Toast = {
        id: generateId("toast"),
        message,
        type: options?.type ?? "info",
        action: options?.action,
        duration: options?.duration,
      };
      dispatch({ type: "ADD_TOAST", toast });

      // Auto-dismiss
      const duration = toast.duration ?? (toast.type === "error" ? 7000 : 5000);
      setTimeout(() => {
        removeToast(toast.id);
      }, duration);
    },
    [removeToast]
  );

  const showError = useCallback(
    (message: string, action?: ToastAction) => {
      showToast(message, { type: "error", action });
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string, action?: ToastAction) => {
      showToast(message, { type: "success", action });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess, removeToast }}>
      {children}
      <ToastContainer toasts={state.toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}
