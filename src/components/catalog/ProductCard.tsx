"use client";

import { ImageOff, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import {
  getActiveVariantes,
  getDefaultVariante,
  getProductoImagen,
  toCartItem,
} from "@/lib/catalog";
import { getDescuentoPorcentaje, tienePrecioOferta } from "@/lib/pricing";
import { useCartStore } from "@/store/useCartStore";
import type { Producto, Variante } from "@/types";

interface ProductCardProps {
  producto: Producto;
}

export function ProductCard({ producto }: ProductCardProps) {
  const variantes = useMemo(() => getActiveVariantes(producto), [producto]);
  const [selectedVariant, setSelectedVariant] = useState<Variante | undefined>(
    () => getDefaultVariante(producto) ?? getActiveVariantes(producto)[0],
  );
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const enStock = (selectedVariant?.stockDisponible ?? 0) > 0;
  const imagenUrl = selectedVariant?.imagenUrl || getProductoImagen(producto, selectedVariant);

  const onSelectVariante = (event: ChangeEvent<HTMLSelectElement>) => {
    const varianteEncontrada = producto.variantes.find(
      (v) => String(v.id) === event.target.value,
    );
    if (varianteEncontrada) setSelectedVariant(varianteEncontrada);
  };

  const onAddToCart = () => {
    if (!selectedVariant || !enStock) return;
    addItem(toCartItem(producto, selectedVariant));
    openCart();
  };

  console.log("Variante actual:", selectedVariant);

  return (
    <article className="product-card flex h-full flex-col p-4">
      <Link href={`/productos/${producto.id}`} className="group block">
        <div className="relative flex h-60 items-center justify-center overflow-hidden rounded-lg bg-white">
          {imagenUrl ? (
            <img
              src={imagenUrl}
              alt={selectedVariant ? selectedVariant.nombre ?? producto.nombre : producto.nombre}
              className="h-full w-full object-contain object-center p-2"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted">
              <ImageOff className="size-8" aria-hidden />
            </div>
          )}
          {selectedVariant && tienePrecioOferta(selectedVariant) ? (
            <Badge kind="descuento" className="absolute top-2 left-2 shadow-sm">
              -{getDescuentoPorcentaje(selectedVariant)}%
            </Badge>
          ) : null}
        </div>
        <h3 className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold text-main group-hover:text-primary">
          {selectedVariant ? selectedVariant.nombre : producto.nombre}
        </h3>
      </Link>

      <p className="mt-1 text-xs text-muted">SKU {selectedVariant?.sku ?? "—"}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge kind={enStock ? "stock" : "consultar"} />
        {selectedVariant ? (
          <PriceDisplay source={selectedVariant} size="sm" />
        ) : (
          <p className="text-sm font-semibold text-primary">Consultar</p>
        )}
      </div>

      {variantes.length > 1 ? (
        <label className="mt-3 block">
          <span className="sr-only">Elegir variante de {selectedVariant ? selectedVariant.nombre : producto.nombre}</span>
          <select
            value={selectedVariant?.id != null ? String(selectedVariant.id) : ""}
            onChange={onSelectVariante}
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {variantes.map((variante) => (
              <option key={variante.id ?? variante.sku} value={String(variante.id)}>
                {variante.variante_nombre?.trim() || "—"}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-auto pt-3">
        <Button
          variant="accent"
          className="w-full px-2 text-xs sm:text-sm"
          disabled={!selectedVariant || !enStock}
          onClick={onAddToCart}
        >
          <ShoppingBag className="size-4" aria-hidden />
          Agregar al Presupuesto
        </Button>
      </div>
    </article>
  );
}
