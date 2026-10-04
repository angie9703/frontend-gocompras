import { PackageSearch } from "lucide-react";
import { ProductCard } from "@/components/catalog/ProductCard";
import { cn } from "@/lib/cn";
import type { Producto } from "@/types";

interface ProductGridProps {
  productos: Producto[];
  loading?: boolean;
  className?: string;
}

function ProductCardSkeleton() {
  return (
    <div className="product-card flex h-full animate-pulse flex-col justify-between p-3 sm:p-4">
      <div>
        <div className="h-40 rounded-lg bg-slate-200 sm:h-52 md:h-60" />
        <div className="mt-3 h-12 w-full rounded bg-slate-200" />
        <div className="mt-2 h-4 w-2/3 rounded bg-slate-200" />
        <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-1/3 rounded bg-slate-200" />
      </div>
      <div className="mt-4 h-11 rounded-lg bg-slate-200" />
    </div>
  );
}

export function ProductGrid({ productos, loading = false, className }: ProductGridProps) {
  if (loading) {
    return (
      <div className={cn("catalog-grid", className)}>
        {Array.from({ length: 8 }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <PackageSearch className="size-10 text-muted" aria-hidden />
        <p className="mt-4 font-semibold text-main">No se encontraron productos</p>
        <p className="mt-1 max-w-md text-sm text-muted">
          Probá con otro SKU, nombre o categoría. Si no aparece, un vendedor puede ayudarte por
          WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("catalog-grid", className)}>
      {productos.map((producto) => (
        <ProductCard key={producto.id} producto={producto} />
      ))}
    </div>
  );
}
