"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { getProductos } from "@/services/productos";
import type { Producto } from "@/types";

export function FeaturedProducts() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const destacados = await getProductos({ destacado: true, pageSize: 5, orden: "recientes" });
        let items = destacados.data.slice(0, 5);
        if (items.length < 5) {
          const fallback = await getProductos({ pageSize: 5, orden: "recientes" });
          const seen = new Set(items.map((item) => item.id));
          for (const producto of fallback.data) {
            if (items.length >= 5) break;
            if (!seen.has(producto.id)) {
              items = [...items, producto];
              seen.add(producto.id);
            }
          }
        }
        if (!cancelled) setProductos(items.slice(0, 5));
      } catch {
        if (!cancelled) setProductos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="destacados" className="mx-auto w-full max-w-7xl px-4 pt-4 pb-8 sm:px-6 md:pb-16 lg:pt-6">
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-6">
        <h2 className="text-lg font-semibold text-main sm:text-2xl">Productos destacados</h2>
        <Link
          href="/productos"
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <span className="sm:hidden">Ver todo</span>
          <span className="hidden sm:inline">Ver catálogo completo</span>
          <ChevronRight className="size-4 sm:hidden" aria-hidden />
          <ArrowRight
            className="hidden size-4 transition-transform group-hover:translate-x-0.5 sm:block"
            aria-hidden
          />
        </Link>
      </div>
      <ProductGrid productos={productos} loading={loading} layout="featured" />
    </section>
  );
}
