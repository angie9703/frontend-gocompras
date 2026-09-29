"use client";

import { Box, Cable, LayoutGrid, Lightbulb, Wrench, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buildCatalogPath } from "@/lib/catalogQuery";
import { getCategorias } from "@/services/categorias";
import type { Categoria } from "@/types";

const CATEGORY_ICONS = [
  Cable,
  Zap,
  Lightbulb,
  Box,
  Wrench,
  LayoutGrid,
];

export function PopularCategories() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getCategorias()
      .then((items) => {
        if (!cancelled) setCategorias(items.slice(0, 5));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 md:py-16">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-main">Categorías populares</h2>
          <p className="mt-1 text-sm text-muted">Entrá directo al rubro que estás buscando.</p>
        </div>
        <Link href="/productos" className="hidden text-sm font-semibold text-primary hover:underline sm:inline">
          Ver todas
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="product-card h-28 animate-pulse" />
            ))
          : categorias.map((categoria, index) => {
              const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length];
              const href = buildCatalogPath(new URLSearchParams(), {
                categoria: categoria.slug,
                categoriaId: categoria.id > 0 ? categoria.id : null,
              });
              return (
                <Link
                  key={`${categoria.id}-${categoria.slug}`}
                  href={href}
                  className="product-card flex flex-col items-start gap-3 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-main">{categoria.nombre}</span>
                </Link>
              );
            })}
      </div>
    </section>
  );
}
