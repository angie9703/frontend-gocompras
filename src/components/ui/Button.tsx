import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "accent" | "outline" | "ghost" | "dark" | "subtle";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary font-semibold text-white shadow-sm hover:bg-primary-dark",
  accent: "bg-accent font-semibold text-white shadow-sm hover:bg-accent-hover",
  outline: "border border-slate-300 bg-white font-semibold text-slate-800 shadow-sm hover:border-primary hover:text-primary",
  ghost: "bg-transparent font-semibold text-slate-700 hover:bg-slate-100",
  // Línea visual shadcn/tremor del panel admin.
  dark: "bg-slate-900 font-medium text-white shadow-sm transition-colors hover:bg-slate-800",
  subtle: "border border-slate-200 bg-white font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50",
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={cn(
        "btn-touch inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
