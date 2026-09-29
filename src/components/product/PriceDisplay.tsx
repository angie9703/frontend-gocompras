import type { HTMLAttributes } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatARS } from "@/lib/money";
import { getDescuentoPorcentaje, getPrecioLista, getPrecioOferta, tienePrecioOferta } from "@/lib/pricing";
import type { Variante } from "@/types";

type PriceSource =
  | Pick<Variante, "precio" | "precioLista" | "precioOferta" | "descuentoPorcentaje">
  | {
      precioUnitario: number;
      precioLista?: number;
      descuentoPorcentaje?: number;
    };

interface PriceDisplayProps extends HTMLAttributes<HTMLDivElement> {
  source: PriceSource;
  size?: "sm" | "md" | "lg";
}

function resolvePrices(source: PriceSource) {
  if ("precioUnitario" in source) {
    const lista = source.precioLista ?? source.precioUnitario;
    const oferta = source.precioUnitario;
    const descuento =
      source.descuentoPorcentaje && source.descuentoPorcentaje > 0
        ? Math.round(source.descuentoPorcentaje)
        : lista > 0 && oferta < lista
          ? Math.round((1 - oferta / lista) * 100)
          : 0;
    return { lista, oferta, descuento, enOferta: descuento > 0 && oferta < lista };
  }

  return {
    lista: getPrecioLista(source),
    oferta: getPrecioOferta(source),
    descuento: getDescuentoPorcentaje(source),
    enOferta: tienePrecioOferta(source),
  };
}

const sizeClasses = {
  sm: {
    oferta: "text-sm font-semibold text-accent",
    lista: "text-xs text-muted line-through",
  },
  md: {
    oferta: "text-base font-bold text-accent",
    lista: "text-sm text-muted line-through",
  },
  lg: {
    oferta: "text-3xl font-semibold text-accent",
    lista: "text-base text-muted line-through",
  },
} as const;

export function PriceDisplay({ source, size = "md", className, ...props }: PriceDisplayProps) {
  const { lista, oferta, descuento, enOferta } = resolvePrices(source);
  const classes = sizeClasses[size];

  if (!(oferta > 0) && !(lista > 0)) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)} {...props}>
        <p className={cn(classes.oferta, "text-primary")}>Consultar</p>
      </div>
    );
  }

  if (!enOferta) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)} {...props}>
        <p className={cn(classes.oferta, "text-primary")}>{formatARS(oferta || lista)}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} {...props}>
      <p className={classes.lista}>{formatARS(lista)}</p>
      <p className={classes.oferta}>{formatARS(oferta)}</p>
      <Badge kind="descuento">-{descuento}%</Badge>
    </div>
  );
}
