import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "btn",
        variant === "primary" && "btn-primary",
        variant === "secondary" && "btn-secondary",
        variant === "danger" && "btn-danger",
        variant === "outline" && "btn-outline",
        variant === "ghost" && "btn-ghost",
        size === "sm" && "min-h-8 px-3 text-xs",
        size === "lg" && "min-h-10 px-6",
        size === "icon" && "min-h-9 w-9 px-0",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
