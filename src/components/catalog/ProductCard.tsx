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
  getEspecificacionClave,
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
  const titulo = selectedVariant?.nombre?.trim() || producto.nombre;
  const especificacion = getEspecificacionClave(titulo, selectedVariant?.atributos);

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
    <article className="product-card flex h-full flex-col justify-between p-3 sm:p-4">
      <div className="flex flex-1 flex-col">
        <Link href={`/productos/${producto.id}`} className="group block">
          <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-lg bg-white sm:h-52 md:h-60">
            {imagenUrl ? (
              <img
                src={imagenUrl}
                alt={titulo}
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
          <h3 className="mt-3 line-clamp-3 min-h-12 text-[13px] leading-4 font-semibold text-main group-hover:text-primary md:line-clamp-2 md:min-h-10 md:text-sm md:leading-5">
            {titulo}
          </h3>
          {especificacion ? (
            <p className="mt-1 text-[13px] leading-4 font-semibold text-primary">{especificacion}</p>
          ) : null}
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
            <span className="sr-only">Elegir variante de {titulo}</span>
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
      </div>

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
