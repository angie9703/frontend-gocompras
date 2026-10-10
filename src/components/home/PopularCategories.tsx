"use client";

import { ChevronRight, Package } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buildCatalogPath } from "@/lib/catalogQuery";
import { cn } from "@/lib/cn";
import { getCategoriasDestacadas } from "@/services/categorias";
import type { CategoriaDestacada } from "@/types";

function catalogHref(categoria: CategoriaDestacada) {
  return buildCatalogPath(new URLSearchParams(), {
    categoria: categoria.slug,
    categoriaId: categoria.id > 0 ? categoria.id : null,
  });
}

function centrarFila(index: number, total: number): string {
  const resto = total % 3;
  if (resto === 2 && index === total - 2) return "col-start-2 lg:col-start-auto";
  if (resto === 1 && index === total - 1) return "col-start-3 lg:col-start-auto";
  return "";
}

export function PopularCategories() {
  const [categorias, setCategorias] = useState<CategoriaDestacada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void getCategoriasDestacadas()
      .then((items) => {
        if (!cancelled) setCategorias(items);
      })
      .catch(() => {
        if (!cancelled) setCategorias([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && categorias.length === 0) return null;

  return (
    <section
      aria-label="Explorá por rubro"
      className="mx-auto mt-4 w-full max-w-7xl px-4 sm:px-6 lg:mt-6"
    >
      <div className="mb-2 hidden justify-end md:flex">
        <Link
          href="/productos"
          className="inline-flex items-center gap-0.5 text-sm font-semibold text-primary hover:underline"
        >
          Ver todas
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="mx-auto grid w-full max-w-md grid-cols-6 gap-x-2 gap-y-3 px-2 md:gap-y-4 lg:mx-0 lg:max-w-none lg:grid-cols-5 lg:gap-6 lg:px-0">
        {loading
          ? Array.from({ length: 5 }, (_, index) => (
              <div key={index} className={cn("col-span-2 flex flex-col items-center lg:col-span-1", centrarFila(index, 5))}>
                <div className="size-14 animate-pulse rounded-full bg-slate-200 md:size-16 lg:size-28" />
                <div className="mt-1 h-3 w-12 animate-pulse rounded bg-slate-200 lg:mt-3" />
              </div>
            ))
          : categorias.map((categoria, index) => (
              <Link
                key={`${categoria.id}-${categoria.slug}`}
                href={catalogHref(categoria)}
                className={cn(
                  "group col-span-2 flex cursor-pointer flex-col items-center text-center lg:col-span-1",
                  centrarFila(index, categorias.length),
                )}
              >
                <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-100 p-2 isolate md:h-16 md:w-16 lg:h-28 lg:w-28 lg:transform lg:border lg:border-slate-200/60 lg:bg-slate-100/90 lg:p-4 lg:shadow-sm lg:transition-all lg:duration-300 lg:group-hover:-translate-y-1 lg:group-hover:shadow-md">
                  {categoria.imagenUrl ? (
                    <img
                      src={categoria.imagenUrl}
                      alt=""
                      className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <Package className="size-5 text-slate-400 md:size-6 lg:size-8" aria-hidden />
                  )}
                </span>
                <span className="mt-1 line-clamp-2 px-0.5 text-center text-xs leading-tight font-medium text-slate-700 md:mt-2 lg:mt-3 lg:px-0 lg:text-base lg:leading-5 lg:font-semibold lg:text-slate-800 lg:transition-colors lg:group-hover:text-blue-600">
                  {categoria.titulo}
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
}
