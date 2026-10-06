import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "primary" | "secondary" | "accent";
export type BadgeKind = "stock" | "descuento" | "retiro-local" | "punto-seguro" | "consultar";

const kindPresets: Record<BadgeKind, { label: string; variant: BadgeVariant }> = {
  stock: { label: "En Stock", variant: "secondary" },
  descuento: { label: "Descuento", variant: "secondary" },
  "retiro-local": { label: "Retiro Local", variant: "primary" },
  "punto-seguro": { label: "Punto Seguro", variant: "primary" },
  consultar: { label: "Consultar", variant: "primary" },
};

const variantClasses: Record<BadgeVariant, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary text-main",
  accent: "bg-accent text-white",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  kind?: BadgeKind;
  variant?: BadgeVariant;
  children?: ReactNode;
}

export function Badge({ kind, variant, className, children, ...props }: BadgeProps) {
  const preset = kind ? kindPresets[kind] : undefined;
  const resolvedVariant = variant ?? preset?.variant ?? "primary";
  const content = children ?? preset?.label;
  const enStock = kind === "stock";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs tracking-wide",
        enStock
          ? "bg-green-50 font-medium text-green-700"
          : cn("font-semibold", variantClasses[resolvedVariant]),
        className,
      )}
      {...props}
    >
      {content}
    </span>
  );
}
