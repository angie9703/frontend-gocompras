"use client";

import { LayoutGrid, Package } from "lucide-react";
import type { CatalogQueryState } from "@/lib/catalogQuery";
import { cn } from "@/lib/cn";
import type { Categoria } from "@/types";

interface CatalogRubrosSliderProps {
  query: CatalogQueryState;
  categorias: Categoria[];
  categoriaActiva?: Categoria;
  imagenesCategoria: Record<number, string>;
  imagenesSubcategoria: Record<string, string>;
  loading?: boolean;
  onChange: (patch: Partial<CatalogQueryState>) => void;
}

interface Burbuja {
  key: string;
  label: string;
  imagen?: string;
  todos?: boolean;
  active: boolean;
  onSelect: () => void;
}

const RESET_FILTROS: Partial<CatalogQueryState> = {
  categoria: "",
  categoriaId: "",
  subcategoria: "",
  marcaId: "",
  precioMin: "",
  precioMax: "",
  enStock: false,
  ofertas: false,
};

export function CatalogRubrosSlider({
  query,
  categorias,
  categoriaActiva,
  imagenesCategoria,
  imagenesSubcategoria,
  loading = false,
  onChange,
}: CatalogRubrosSliderProps) {
  const subcategorias = categoriaActiva?.subcategorias ?? [];
  const modoSubcategorias = Boolean(categoriaActiva) && subcategorias.length > 0;

  const imagenCategoria = (categoria: Categoria) =>
    categoria.imagenUrl?.trim() || imagenesCategoria[categoria.id];

  const seleccionarCategoria = (categoria: Categoria) => {
    const misma = categoriaActiva?.id === categoria.id;
    onChange({
      categoria: categoria.slug,
      categoriaId: categoria.id > 0 ? String(categoria.id) : "",
      subcategoria: "",
      ...(misma ? {} : { marcaId: "" }),
    });
  };

  const todos: Burbuja = {
    key: "todos",
    label: "Todos",
    todos: true,
    active: !categoriaActiva && !query.subcategoria,
    onSelect: () => onChange(RESET_FILTROS),
  };

  const burbujas: Burbuja[] =
    modoSubcategorias && categoriaActiva
      ? [
          todos,
          {
            key: `cat-${categoriaActiva.id}`,
            label: categoriaActiva.nombre,
            imagen: imagenCategoria(categoriaActiva),
            active: !query.subcategoria,
            onSelect: () => seleccionarCategoria(categoriaActiva),
          },
          ...subcategorias.map((nombre) => ({
            key: `sub-${nombre}`,
            label: nombre,
            imagen: imagenesSubcategoria[nombre.trim().toLowerCase()],
            active: query.subcategoria === nombre,
            onSelect: () => onChange({ subcategoria: nombre }),
          })),
        ]
      : [
          todos,
          ...categorias.map((categoria) => ({
            key: `cat-${categoria.id}-${categoria.slug}`,
            label: categoria.nombre,
            imagen: imagenCategoria(categoria),
            active: categoriaActiva?.id === categoria.id,
            onSelect: () => seleccionarCategoria(categoria),
          })),
        ];

  return (
    <nav
      aria-label={modoSubcategorias ? `Subcategorías de ${categoriaActiva?.nombre}` : "Rubros"}
      className="-mx-4 block px-3 lg:hidden"
    >
      <div className="mb-3 flex snap-x gap-3 overflow-x-auto px-1 py-2 scrollbar-none">
        {loading
          ? Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex w-16 shrink-0 flex-col items-center">
                <span className="size-14 animate-pulse rounded-full bg-slate-200" />
                <span className="mt-1 flex h-8 w-full justify-center">
                  <span className="h-2.5 w-12 animate-pulse rounded bg-slate-200" />
                </span>
              </div>
            ))
          : burbujas.map((burbuja) => (
              <button
                key={burbuja.key}
                type="button"
                onClick={burbuja.onSelect}
                aria-pressed={burbuja.active}
                className="flex w-16 shrink-0 snap-start touch-manipulation flex-col items-center"
              >
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center overflow-hidden rounded-full transition-all duration-200",
                    !burbuja.active && "border border-slate-200/50 bg-slate-100/90 p-2 text-slate-600",
                    burbuja.active &&
                      "scale-105 border-2 border-brand-orange bg-brand-orange/10 p-1.5 text-brand-orange shadow-sm",
                  )}
                >
                  {burbuja.imagen ? (
                    <img
                      src={burbuja.imagen}
                      alt=""
                      className="max-h-full max-w-full object-contain mix-blend-multiply"
                    />
                  ) : burbuja.todos ? (
                    <LayoutGrid className="size-5" aria-hidden />
                  ) : (
                    <Package className="size-5" aria-hidden />
                  )}
                </span>
                <span className="mt-1 line-clamp-2 h-8 w-full text-center text-[11px] leading-tight font-medium text-slate-600">
                  {burbuja.label}
                </span>
              </button>
            ))}
      </div>
    </nav>
  );
}
