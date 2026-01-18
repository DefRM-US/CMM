import { createContext, useContext, ReactNode } from "react";
import { cn } from "../../lib/utils";

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return context;
}

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

/**
 * Root Tabs container - provides context for tab state
 */
export function Tabs({ value, onChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

/**
 * Container for tab triggers
 */
export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn(
        "flex border-b border-[var(--border)] mb-4",
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * Individual tab button
 */
export function TabsTrigger({
  value,
  children,
  className,
  disabled,
}: TabsTriggerProps) {
  const { value: selectedValue, onChange } = useTabsContext();
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => onChange(value)}
      className={cn(
        "px-4 py-2 text-sm font-medium -mb-px transition-colors",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/50",
        isSelected
          ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-b-2 hover:border-[var(--border)]",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

/**
 * Tab content panel - only renders when its value matches the selected tab
 */
export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: selectedValue } = useTabsContext();

  if (value !== selectedValue) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      className={cn("focus:outline-none", className)}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
