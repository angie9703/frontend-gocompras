"use client";

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
    <section id="destacados" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-16">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-main">Productos destacados</h2>
          <p className="mt-1 text-sm text-muted">Armá tu pedido y solicitá tu cotización al instante por WhatsApp.</p>
        </div>
        <Link
          href="/productos"
          className="btn-touch inline-flex items-center justify-center bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Ver catálogo completo
        </Link>
      </div>
      <ProductGrid productos={productos} loading={loading} layout="featured" />
    </section>
  );
}
