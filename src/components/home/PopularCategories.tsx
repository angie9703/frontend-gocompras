"use client";

import { Package } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buildCatalogPath } from "@/lib/catalogQuery";
import { getCategoriasDestacadas } from "@/services/categorias";
import type { CategoriaDestacada } from "@/types";

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
    <section className="mx-auto w-full max-w-7xl py-6 md:py-16">
      <div className="mb-4 flex items-end justify-between gap-3 px-4">
        <div>
          <h2 className="text-2xl font-semibold text-main">Categorías populares</h2>
          <p className="mt-1 text-sm text-muted">Deslizá para ver todos los rubros.</p>
        </div>
        <Link href="/productos" className="hidden shrink-0 text-sm font-semibold text-primary hover:underline sm:inline">
          Ver todas
        </Link>
      </div>

      <div className="flex flex-nowrap space-x-4 overflow-x-auto scroll-smooth px-4 scrollbar-none">
        {loading
          ? Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="w-[5.75rem] shrink-0">
                <div className="size-[5.75rem] animate-pulse rounded-full bg-slate-200" />
                <div className="mx-auto mt-2 h-3 w-14 animate-pulse rounded bg-slate-200" />
              </div>
            ))
          : categorias.map((categoria) => {
              const href = buildCatalogPath(new URLSearchParams(), {
                categoria: categoria.slug,
                categoriaId: categoria.id > 0 ? categoria.id : null,
              });
              return (
                <Link
                  key={`${categoria.id}-${categoria.slug}`}
                  href={href}
                  className="w-[5.75rem] shrink-0"
                >
                  <span className="flex size-[5.75rem] items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-gray-100">
                    {categoria.imagenUrl ? (
                      <img src={categoria.imagenUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <Package className="size-7 text-gray-400" aria-hidden />
                    )}
                  </span>
                  <span className="mt-2 line-clamp-2 block text-center text-xs font-semibold leading-4 text-main">
                    {categoria.titulo}
                  </span>
                </Link>
              );
            })}
      </div>
    </section>
  );
}
