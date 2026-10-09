"use client";

import { Package } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buildCatalogPath } from "@/lib/catalogQuery";
import { getCategoriasDestacadas } from "@/services/categorias";
import type { CategoriaDestacada } from "@/types";

const categoryImageClass =
  "h-auto w-auto max-h-[70%] max-w-[70%] object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105";

function catalogHref(categoria: CategoriaDestacada) {
  return buildCatalogPath(new URLSearchParams(), {
    categoria: categoria.slug,
    categoriaId: categoria.id > 0 ? categoria.id : null,
  });
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
    <section className="mx-auto w-full max-w-7xl px-4 pt-3 pb-4 sm:px-6 md:pt-4 md:pb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800">Explorá por rubro</h2>
        <Link href="/productos" className="hidden shrink-0 text-sm font-semibold text-primary hover:underline md:inline">
          Ver todas
        </Link>
      </div>

      <div className="mx-auto flex max-w-md flex-wrap justify-center gap-x-2 gap-y-4 md:hidden">
        {loading
          ? Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="w-[30%] max-w-[30%] min-w-[28%]">
                <div className="mx-auto size-16 animate-pulse rounded-full bg-slate-200" />
                <div className="mx-auto mt-2 h-3 w-14 animate-pulse rounded bg-slate-200" />
              </div>
            ))
          : categorias.map((categoria) => {
              const href = catalogHref(categoria);
              return (
                <Link
                  key={`${categoria.id}-${categoria.slug}`}
                  href={href}
                  className="group flex w-[30%] min-w-[28%] max-w-[30%] flex-col items-center"
                >
                  <span className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-slate-100 isolate">
                    {categoria.imagenUrl ? (
                      <img src={categoria.imagenUrl} alt="" className={categoryImageClass} />
                    ) : (
                      <Package className="size-7 text-slate-400" aria-hidden />
                    )}
                  </span>
                  <span className="mt-2 line-clamp-2 block px-0.5 text-center text-xs font-semibold leading-4 text-main">
                    {categoria.titulo}
                  </span>
                </Link>
              );
            })}
      </div>

      <div className="hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:bg-slate-50/60 sm:p-6 md:block">
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
          {loading
            ? Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                  <div className="h-20 animate-pulse bg-slate-100 sm:h-24" />
                  <div className="mx-auto my-2 h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                </div>
              ))
            : categorias.map((categoria) => (
                <Link
                  key={`${categoria.id}-${categoria.slug}-desktop`}
                  href={catalogHref(categoria)}
                  className="group flex cursor-pointer flex-col items-center overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md sm:p-5"
                >
                  <span className="flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100 isolate sm:h-24">
                    {categoria.imagenUrl ? (
                      <img
                        src={categoria.imagenUrl}
                        alt=""
                        className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Package className="size-8 text-slate-400" aria-hidden />
                    )}
                  </span>
                  <span className="mt-2 line-clamp-2 block w-full text-center text-sm font-semibold text-slate-800 group-hover:text-blue-900 sm:text-base">
                    {categoria.titulo}
                  </span>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}
